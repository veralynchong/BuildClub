import type { CanvasDoc, CanvasState, Generation } from './types.ts'
import type { VoiceInfo } from '../editor/api.ts'
import { ff } from '../strings/freeform.ts'
import { mergeVoiceOwnership } from './voices.ts'
import { markStale } from './graph.ts'

export interface CanvasDraft { doc: CanvasDoc; version: number }
interface SessionIO {
  save: (version: number, doc: CanvasDoc) => Promise<number>
  readDraft: () => CanvasDraft | null
  writeDraft: (draft: CanvasDraft | null) => void
  changed?: (state: { doc: CanvasDoc; save: 'saved' | 'saving' | 'failed'; conflict: boolean }) => void
  isConflict?: (error: unknown) => boolean
  error?: (error: unknown) => void
}
// The same persistence session is used by the board and sequence tests. Unmount only keeps a draft;
// navigation explicitly awaits prepareReload, so an old component never fires an untracked PUT.
export function createCanvasSession(initial: Pick<CanvasState, 'doc' | 'version'>, io: SessionIO) {
  let doc = initial.doc, saved = initial.doc, version = initial.version
  let conflict = false, suspended = false
  let save: 'saved' | 'saving' | 'failed' = 'saved'
  let inflight: Promise<boolean> | null = null
  let draft = io.readDraft()
  const notify = () => io.changed?.({ doc, save, conflict })
  const backup = () => { if (doc !== saved) { draft = { doc, version }; io.writeDraft(draft) } }
  const flush = async (): Promise<boolean> => {
    if (suspended || conflict) { backup(); return false }
    if (inflight) { if (!await inflight) return false; return flush() }
    if (doc === saved) return true
    const snapshot = doc
    save = 'saving'; notify()
    inflight = (async () => {
      try {
        version = await io.save(version, snapshot); saved = snapshot; save = 'saved'
        if (doc === snapshot) { draft = null; io.writeDraft(null) }
        else backup()
        return true
      } catch (e) {
        save = 'failed'; conflict = io.isConflict?.(e) ?? !!(e as { conflict?: boolean }).conflict
        backup(); io.error?.(e); return false
      } finally { inflight = null; notify() }
    })()
    if (!await inflight) return false
    return doc === saved || flush()
  }
  return {
    doc: () => doc, saved: () => saved, version: () => version,
    recovery: () => draft,
    change(next: CanvasDoc) { if (conflict || suspended) return; doc = next; backup(); notify() },
    flush,
    acceptServer(state: Pick<CanvasState, 'doc' | 'version'>) { doc = saved = state.doc; version = state.version; notify() },
    keepDraft: backup,
    retain(next: CanvasDoc) { doc = next; backup(); notify() },
    restore() { if (!draft) return; doc = draft.doc; conflict = false; suspended = false; backup(); notify() },
    discard() { draft = null; io.writeDraft(null); doc = saved; conflict = false; save = 'saved'; notify() },
    async prepareReload(keepDraft: boolean): Promise<boolean> {
      if (inflight) await inflight
      if (keepDraft) { backup(); suspended = true; return true }
      if (!await flush()) return false
      suspended = true; return true
    },
  }
}

const memory = new Map<string, CanvasDraft>()
export function draftStore(resourceKey: string) {
  let tab = 'memory'
  try {
    tab = globalThis.sessionStorage?.getItem('remake.canvas.tab') ?? Math.random().toString(36).slice(2)
    globalThis.sessionStorage?.setItem('remake.canvas.tab', tab)
  } catch { /* App-level navigation retains the memory fallback. */ }
  const key = `${resourceKey}:${tab}`
  return {
    readDraft: (): CanvasDraft | null => {
      try { const raw = globalThis.localStorage?.getItem(key); return raw ? JSON.parse(raw) : memory.get(key) ?? null }
      catch { return memory.get(key) ?? null }
    },
    writeDraft: (draft: CanvasDraft | null) => {
      if (draft) memory.set(key, draft); else memory.delete(key)
      try { if (draft) globalThis.localStorage?.setItem(key, JSON.stringify(draft)); else globalThis.localStorage?.removeItem(key) }
      catch { /* The in-memory copy still survives an app-level reload. */ }
    },
  }
}

interface SelectionIO {
  current: () => CanvasDoc
  change: (doc: CanvasDoc) => void
  flush: () => Promise<boolean>
  matchesInputs?: (gen: Generation) => boolean
  generations?: Generation[]
  voices: VoiceInfo[]
  importVoice: (genId: string, nodeId: string) => Promise<VoiceInfo>
  onVoice: (voice: VoiceInfo) => void
}
export async function selectGeneration(gen: Generation, io: SelectionIO): Promise<boolean> {
  const node = io.current().nodes.find((n) => n.id === gen.nodeId)
  if (!node || gen.status !== 'done') return false
  const voice = gen.kind === 'voice' ? mergeVoiceOwnership(io.current(), io.voices).find((v) => v.genId === gen.id && v.nodeId === gen.nodeId) ?? await io.importVoice(gen.id, gen.nodeId) : null
  const mappedVoice = voice ? { ...voice, genId: gen.id, nodeId: gen.nodeId } : null
  if (mappedVoice) io.onVoice(mappedVoice)
  // Re-read after importing: editing while the request was in flight must survive.
  const next = { ...io.current(), nodes: io.current().nodes.map((n) => {
    if (n.id !== gen.nodeId) return n
    // Preserve the explicit legacy pair before changing the selected version.
    const previousPair = n.type === 'voice' && n.data.selected && n.data.voiceId ? { [n.data.selected]: n.data.voiceId } : {}
    const voiceSources = { ...previousPair, ...n.data.voiceSources, ...(mappedVoice ? { [gen.id]: mappedVoice.id } : {}) }
    const data = { ...n.data, ...(io.matchesInputs?.(gen) && !gen.inputs.inputStamp ? { stale: false } : {}), selected: gen.id, ...(mappedVoice ? { voiceId: mappedVoice.id, voiceSources, voiceIds: [...new Set([...(n.data.voiceIds ?? []), ...(n.data.voiceId ? [n.data.voiceId] : []), ...Object.values(voiceSources), mappedVoice.id])] } : {}) }
    if (data.awaiting === gen.id) delete data.awaiting
    return { ...n, data }
  }) }
  io.change(markStale(next, gen.nodeId, [...(io.generations ?? []), gen]))
  return io.flush()
}
export async function reconcileGenerations(gens: Generation[], io: SelectionIO, { restoreBatches = false }: { restoreBatches?: boolean } = {}): Promise<void> {
  if (restoreBatches) {
    // Reconstruct only the latest request in the complete node history. A historic
    // batch must not erase a newer count1 awaiting, including a completed one.
    for (const n of io.current().nodes) {
      const history = gens.filter((g) => g.nodeId === n.id).sort((a, b) => a.createdAt - b.createdAt)
      const latest = history[history.length - 1]
      if (!latest) continue
      const awaiting = history.find((g) => g.id === n.data.awaiting)
      if (awaiting && !awaiting.inputs.batchId && awaiting.createdAt >= latest.createdAt) {
        if (n.data.awaitingBatch !== undefined && !await rememberGeneration(awaiting, io)) throw new Error(ff('saveFirst'))
        continue
      }
      if (!latest.inputs.batchId) {
        const active = ['queued', 'running', 'waiting'].includes(latest.status)
        if ((active || (!n.data.selected && latest.status === 'done')) &&
          (n.data.awaiting !== latest.id || n.data.awaitingBatch !== undefined)) {
          if (!await rememberGeneration(latest, io)) throw new Error(ff('saveFirst'))
        }
        continue
      }
      const children = history.filter((g) => g.inputs.batchId === latest.inputs.batchId)
      if (children.some((g) => ['queued', 'running', 'waiting'].includes(g.status)) ||
        (!n.data.selected && children.some((g) => g.status === 'done'))) {
        if (!await rememberBatch(children, io)) throw new Error(ff('saveFirst'))
      }
    }
  }
  for (const n of io.current().nodes) {
    if (n.data.awaitingBatch !== undefined) {
      // Read the current selection for every child, including choices made during polling.
      for (const id of n.data.awaitingBatch) {
        const gen = gens.find((g) => g.id === id && g.nodeId === n.id)
        if (!gen || ['queued', 'running', 'waiting'].includes(gen.status)) continue
        const current = io.current().nodes.find((node) => node.id === n.id)
        if (gen.status === 'done' && !current?.data.selected) {
          if (!await selectGeneration(gen, io)) throw new Error(ff('saveFirst'))
        }
        io.change({ ...io.current(), nodes: io.current().nodes.map((node) => {
          if (node.id !== n.id) return node
          const data = { ...node.data }
          const remaining = (data.awaitingBatch ?? []).filter((child) => child !== id)
          if (remaining.length) data.awaitingBatch = remaining
          else delete data.awaitingBatch
          return { ...node, data }
        }) })
        if (!await io.flush()) throw new Error(ff('saveFirst'))
      }
      if (io.current().nodes.find((node) => node.id === n.id)?.data.awaitingBatch?.length === 0) {
        io.change({ ...io.current(), nodes: io.current().nodes.map((node) => {
          if (node.id !== n.id) return node
          const data = { ...node.data }; delete data.awaitingBatch
          return { ...node, data }
        }) })
        if (!await io.flush()) throw new Error(ff('saveFirst'))
      }
      continue
    }
    const orphan = !n.data.selected && ['storyboard', 'video', 'voice'].includes(n.type) ? gens.filter((g) => g.nodeId === n.id && g.status === 'done').sort((a, b) => b.createdAt - a.createdAt)[0] : null
    const awaiting = n.data.awaiting ?? orphan?.id
    if (!awaiting) continue
    const gen = gens.find((g) => g.id === awaiting && g.nodeId === n.id)
    if (!gen || ['queued', 'running', 'waiting'].includes(gen.status)) continue
    if (gen.status === 'done') {
      if (!await selectGeneration(gen, io)) throw new Error(ff('saveFirst'))
    } else {
      io.change({ ...io.current(), nodes: io.current().nodes.map((node) => { if (node.id !== n.id) return node; const data = { ...node.data }; delete data.awaiting; return { ...node, data } }) })
      if (!await io.flush()) throw new Error(ff('saveFirst'))
    }
  }
}

export async function rememberBatch(gens: Generation[], io: Pick<SelectionIO, 'current' | 'change' | 'flush'>): Promise<boolean> {
  const nodeId = gens[0]?.nodeId
  if (!nodeId || gens.some((g) => g.nodeId !== nodeId)) return false
  io.change({ ...io.current(), nodes: io.current().nodes.map((n) => {
    if (n.id !== nodeId) return n
    const data = { ...n.data, awaitingBatch: gens.map((g) => g.id) }
    delete data.awaiting
    return { ...n, data }
  }) })
  return io.flush()
}

export async function rememberGeneration(gen: Generation, io: Pick<SelectionIO, 'current' | 'change' | 'flush'>): Promise<boolean> {
  io.change({ ...io.current(), nodes: io.current().nodes.map((n) => n.id === gen.nodeId ? { ...n, data: { ...n.data, awaitingBatch: undefined, awaiting: gen.id } } : n) })
  return io.flush()
}
