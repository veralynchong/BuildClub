import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { CanvasState, GenModel, Generation } from '../../lib/canvas/types'
import type { ResourceRef } from '../../lib/canvas/resource'
import { pendingGen } from '../../lib/canvas/graph'
import { generationItems, getBudget, getCanvas, pollGen, putCanvas, quoteNode, startGen } from '../../lib/canvas/api'
import { applyLegacyFrames } from '../../lib/canvas/legacy'
import { finish, putEdit, regenerate, savePrompt, type GridIO } from '../../lib/shotGridActions'
import { cellOfNode, chooseVersion, stepVersion, type GridCell } from '../../lib/shotGrid'
import type { Budget } from '../../lib/canvas/types'
import type { Shot } from '../../types'
import { t } from '../../lib/i18n'

interface Args {
  resource: ResourceRef
  state: CanvasState | null
  setState: Dispatch<SetStateAction<CanvasState | null>>
  shots: Shot[]
  onShotsChange: (shots: Shot[]) => void
  setBudget: (b: Budget | null) => void
}

// Saves and generation for the storyboard grid. Writes run one after another so each one saves on the version the
// last one left; one poll follows each running job and stops when the screen closes.
export function useGridActions({ resource, state, setState, shots, onShotsChange, setBudget }: Args) {
  const [note, setNote] = useState('')
  // A quote above the price shown, per frame node and model; the next press agrees to it.
  const [quoted, setQuoted] = useState<Record<string, { model: string; usd: number }>>({})
  const live = useRef(state)
  live.current = state
  const shotsRef = useRef(shots)
  shotsRef.current = shots
  const chain = useRef<Promise<unknown>>(Promise.resolve())
  const polled = useRef(new Set<string>())
  // Frames with a regenerate queued or running: stops a double click from starting (and charging) a second job.
  const [inFlight, setInFlight] = useState<ReadonlySet<string>>(new Set())
  const flying = useRef(new Set<string>())
  const mark = (nodeId: string, on: boolean) => {
    if (on) flying.current.add(nodeId); else flying.current.delete(nodeId)
    setInFlight(new Set(flying.current))
  }
  const abort = useRef<AbortController>(new AbortController())

  useEffect(() => {
    abort.current = new AbortController()
    const seen = polled.current
    return () => { abort.current.abort(); seen.clear() }
  }, [])

  const io: GridIO = {
    put: (version, doc) => putCanvas(resource, version, doc),
    reload: () => getCanvas(resource),
    start: async (body) => generationItems(await startGen(resource, body))[0],
    ...(resource.kind === 'workspace' ? { quote: (nodeId: string, version: number) => quoteNode(resource, nodeId, version) } : {}),
  }

  // Runs one write after the ones before it; a failure becomes the note and never breaks the chain.
  const serial = (fn: () => Promise<void>): Promise<void> => {
    const run = chain.current.then(fn).catch((e) => { if (!abort.current.signal.aborted) setNote(e instanceof Error ? e.message : String(e)) })
    chain.current = run
    return run
  }
  const apply = (doc: CanvasState['doc'], version: number, gens?: Generation[]) => {
    setState((s) => {
      if (!s) return s
      const next = { ...s, doc, version, generations: gens ?? s.generations }
      live.current = next
      return next
    })
  }
  const upsert = (gens: Generation[], gen: Generation): Generation[] => [...gens.filter((g) => g.id !== gen.id), gen]

  const settle = (nodeId: string, end: Generation) => serial(async () => {
    const cur = live.current
    if (!cur) return
    const saved = await putEdit(io, cur, (doc) => finish({ doc }, nodeId, end))
    const { doc, version } = saved
    const fresh = saved.generations
    const gens = upsert(fresh ?? live.current?.generations ?? [], end)
    apply(doc, version, gens)
    if (resource.kind === 'legacy-plan') {
      const next = applyLegacyFrames(doc, shotsRef.current, gens)
      if (next !== shotsRef.current) onShotsChange(next)
    }
    setBudget(await getBudget().catch(() => null))
    if (end.status !== 'done') setNote(end.error || '')
  })

  const follow = (gen: Generation) => {
    if (polled.current.has(gen.id)) return
    polled.current.add(gen.id)
    const signal = abort.current.signal
    pollGen(resource, gen.id, (g) => setState((s) => (s ? { ...s, generations: upsert(s.generations, g) } : s)), { signal })
      .then((end) => { if (end && !signal.aborted) return settle(gen.nodeId, end) })
      .catch((e) => { if (!signal.aborted) setNote(e instanceof Error ? e.message : String(e)) })
  }

  // A job still running when the grid opened (or started elsewhere) is followed too.
  useEffect(() => {
    for (const g of state?.generations ?? []) if (['queued', 'running', 'waiting'].includes(g.status) && g.kind === 'image') follow(g)
    // follow only reads refs and stable setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.generations])

  return {
    note,
    clearNote: () => setNote(''),
    prompt: (nodeId: string, prompt: string | null) => serial(async () => {
      const cur = live.current
      if (!cur) return
      const out = await savePrompt(io, cur, nodeId, prompt)
      apply(out.doc, out.version, out.generations)
    }),
    quotedUsd: (nodeId: string | null, model: GenModel): number | undefined => {
      const q = nodeId ? quoted[nodeId] : undefined
      return q && q.model === model.id ? q.usd : undefined
    },
    busy: (nodeId: string | null): boolean => !!nodeId && inFlight.has(nodeId),
    // `fromPopover`: the cell carries the prompt the popover shows. Otherwise the prompt is rebuilt from the saved doc once
    // the writes queued before this click (an autosave from a popover that just closed) have run.
    regenerate: (cell: GridCell, model: GenModel, agreedUsd: number, fromPopover = false) => {
      const nodeId = cell.nodeId
      if (!nodeId || flying.current.has(nodeId)) return Promise.resolve()
      mark(nodeId, true)
      return serial(async () => {
        const cur = live.current
        if (!cur || pendingGen(nodeId, cur.generations)) return
        const use = fromPopover ? cell : cellOfNode(cur.doc, shotsRef.current, cur.generations, nodeId) ?? cell
        const out = await regenerate(io, cur, use, shotsRef.current, cur.generations, model, agreedUsd)
        if (out.priceChanged !== undefined) {
          apply(out.doc, out.version, out.generations ?? cur.generations)
          setQuoted((q) => ({ ...q, [nodeId]: { model: model.id, usd: out.priceChanged } }))
          setNote(t('grid.priceChanged'))
          return
        }
        setQuoted((q) => Object.fromEntries(Object.entries(q).filter(([k]) => k !== nodeId)))
        apply(out.doc, out.version, upsert(out.generations ?? cur.generations, out.gen))
        if (out.saveError) setNote(out.saveError)
        follow(out.gen)
      }).finally(() => mark(nodeId, false))
    },
    step: (cell: GridCell, dir: -1 | 1) => {
      const to = stepVersion(cell, dir)
      if (!to || !cell.nodeId) return
      const nodeId = cell.nodeId
      return serial(async () => {
        const cur = live.current
        if (!cur) return
        const saved = await putEdit(io, cur, (doc) => chooseVersion(doc, nodeId, to))
        apply(saved.doc, saved.version, saved.generations)
        if (resource.kind === 'legacy-plan') {
          const next = applyLegacyFrames(saved.doc, shotsRef.current, saved.generations ?? cur.generations)
          if (next !== shotsRef.current) onShotsChange(next)
        }
      })
    },
  }
}
