import { useCallback, useEffect, useRef, useState } from 'react'
import type { Shot } from '../../types'
import type { Key } from '../i18n.ts'
import type { CanvasDoc, Generation } from '../canvas/types.ts'
import type { Take } from '../takes.ts'
import type { EditHook } from './useEditProject.ts'
import type { SourcesHook } from './useSources.ts'
import { applyNewer, clipStatus, fillByShotOrder, insertClip, isPrimaryPin, newClipId, repinIfOld, sourceKey, withPrimary, type ClipStatus } from './timeline.ts'
import type { Clip, ClipSource, SourceInfo } from './types.ts'

export interface TimelineActions {
  addClip: (src: ClipSource, index?: number) => Promise<void> // a node button or a drop; index defaults to the end
  applyNewer: (clipId: string, src: ClipSource) => Promise<void>
  fill: () => Promise<string[]> // fills an empty timeline in shot order; resolves to the ids of the skipped shots
  statusOf: (clip: Clip) => ClipStatus // an ignored "newer" counts as ok
  ignore: (clip: Clip, src: ClipSource) => void // forgotten when the canvas is left
  setPrimary: (shotId: string, src: ClipSource) => void
  isPrimary: (shotId: string, src: ClipSource) => boolean
}

interface Inputs {
  edit: EditHook
  sources: SourcesHook
  shots: Shot[]
  doc: CanvasDoc
  gens: Generation[]
  takes: Take[]
  readOnly: boolean
  openDrawer: () => void
  notify: (key: Key) => void
}

// Everything that puts canvas footage on the timeline. It lives next to the edit project so a node button works
// while the drawer is closed.
export function useTimelineActions(inputs: Inputs): TimelineActions {
  const ref = useRef(inputs)
  useEffect(() => {
    ref.current = inputs
  })
  const [ignored, setIgnored] = useState<Set<string>>(() => new Set())

  // The footage's length; the list is read again once when it is not there yet.
  const infoFor = useCallback(async (src: ClipSource): Promise<SourceInfo | undefined> => {
    const key = sourceKey(src)
    const known = ref.current.sources.sources?.find((s) => s.key === key)
    if (known) return known
    try {
      return (await ref.current.sources.refresh()).find((s) => s.key === key)
    } catch {
      return undefined
    }
  }, [])

  const addClip = useCallback(
    async (src: ClipSource, index?: number) => {
      if (ref.current.readOnly) return
      ref.current.openDrawer()
      const info = await infoFor(src)
      const { edit, notify } = ref.current
      if (!info) return notify('editor.processing')
      const p = edit.project
      if (!p) return
      const next = insertClip(p, src, info.duration, index ?? p.clips.length, newClipId(p))
      if (next === p) return notify('editor.sources.full')
      edit.update(next)
    },
    [infoFor],
  )

  const apply = useCallback(
    async (clipId: string, src: ClipSource) => {
      const info = await infoFor(src)
      const { edit, notify } = ref.current
      if (!info) return notify('editor.processing')
      const p = edit.project
      if (!p) return
      const next = applyNewer(p, clipId, src, info.duration)
      if (next === p) return
      const old = p.clips.find((c) => c.id === clipId)?.source
      edit.update(old ? { ...next, primaries: repinIfOld(next.primaries, src.shotId, old, src) } : next)
    },
    [infoFor],
  )

  const fill = useCallback(async () => {
    const { edit, shots, doc, gens, takes, sources } = ref.current
    const p = edit.project
    if (!p || ref.current.readOnly) return []
    let list: SourceInfo[] = sources.sources ?? []
    try {
      list = await sources.refresh()
    } catch {
      /* use the list we have */
    }
    const r = fillByShotOrder(p, shots, doc, gens, takes, list)
    if (r.project !== p) edit.update(r.project)
    return r.skipped
  }, [])

  const ignoreKey = (clip: Clip, src: ClipSource) => `${clip.id}:${src.kind}:${src.id}`
  const statusOf = (clip: Clip): ClipStatus => {
    const s = clipStatus(clip, inputs.doc, inputs.gens, inputs.takes)
    return s.state === 'newer' && ignored.has(ignoreKey(clip, s.source)) ? { state: 'ok' } : s
  }
  const ignore = (clip: Clip, src: ClipSource) => setIgnored((prev) => new Set(prev).add(ignoreKey(clip, src)))

  const setPrimary = (shotId: string, src: ClipSource) => {
    const p = inputs.edit.project
    if (p) inputs.edit.update({ ...p, primaries: withPrimary(p.primaries, shotId, src) })
  }
  const isPrimary = (shotId: string, src: ClipSource): boolean => {
    const pins = inputs.edit.project?.primaries
    return !!pins && isPrimaryPin(pins, shotId, src)
  }

  return { addClip, applyNewer: apply, fill, statusOf, ignore, setPrimary, isPrimary }
}
