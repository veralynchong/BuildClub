import { useCallback, useEffect, useRef, useState } from 'react'
import type { Shot } from '../../types'
import type { Key } from '../i18n.ts'
import type { CanvasDoc, Generation } from '../canvas/types.ts'
import type { Take } from '../takes.ts'
import type { EditHook } from './useEditProject.ts'
import type { SourcesHook } from './useSources.ts'
import { applyNewer, insertClip, clipStatus, fillByShotOrder, isOnTimeline, newClipId, placeShotClip, repinIfOld, sourceKey, type ClipStatus } from './timeline.ts'
import type { Clip, ClipSource, SourceInfo } from './types.ts'

export interface TimelineActions {
  // Makes `src` its shot's one clip (spec 7.1), replacing the shot's old clip. True when `src` is the shot's clip afterwards;
  // a source that is already on the timeline is left as it is (its trim and volume stay).
  useForShot: (src: ClipSource) => Promise<boolean>
  isInTimeline: (src: ClipSource) => boolean
  applyNewer: (clipId: string, src: ClipSource) => Promise<void>
  fill: () => Promise<string[]> // fills an empty timeline in shot order; resolves to the ids of the skipped shots
  statusOf: (clip: Clip) => ClipStatus // an ignored "newer" counts as ok
  ignore: (clip: Clip, src: ClipSource) => void // forgotten when the canvas is left
}

interface Inputs {
  freeform?: boolean
  edit: EditHook
  sources: SourcesHook
  shots: Shot[]
  doc: CanvasDoc
  gens: Generation[]
  takes: Take[]
  readOnly: boolean
  onPlaced: (shotId: string) => void // a source was put in the timeline
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

  const useForShot = useCallback(
    async (src: ClipSource) => {
      const order = ref.current.shots.flatMap((s) => (s.id ? [s.id] : []))
      if (ref.current.readOnly || (!ref.current.freeform && (!src.shotId || !order.includes(src.shotId)))) return false
      const before = ref.current.edit.current()
      if (!before) return false
      if (isOnTimeline(before, src)) return true
      const info = await infoFor(src)
      const { edit, notify, onPlaced } = ref.current
      if (!info) {
        notify('editor.processing')
        return false
      }
      const p = edit.current() // after the await: the newest project
      if (!p) return false
      if (isOnTimeline(p, src)) return true
      const next = ref.current.freeform ? insertClip(p, src, info.duration, p.clips.length, newClipId(p)) : placeShotClip(p, src, info.duration, order, newClipId(p))
      if (next === p) {
        notify('editor.sources.full')
        return false
      }
      if (ref.current.freeform && edit.persist) {
        if (!await edit.persist(next)) return false
      } else edit.update(next)
      onPlaced(src.shotId ?? '')
      return true
    },
    [infoFor],
  )
  const isInTimeline = (src: ClipSource): boolean => isOnTimeline(inputs.edit.project, src)

  const apply = useCallback(
    async (clipId: string, src: ClipSource) => {
      const info = await infoFor(src)
      const { edit, notify } = ref.current
      if (!info) return notify('editor.processing')
      const p = edit.current()
      if (!p) return
      const next = applyNewer(p, clipId, src, info.duration, src.kind === 'take')
      if (next === p) return
      const old = p.clips.find((c) => c.id === clipId)?.source
      edit.update(old ? { ...next, primaries: repinIfOld(next.primaries, src.shotId, old, src) } : next)
    },
    [infoFor],
  )

  const fill = useCallback(async () => {
    const { edit, shots, doc, gens, takes, sources } = ref.current
    if (!edit.current() || ref.current.readOnly) return []
    let list: SourceInfo[] = sources.sources ?? []
    try {
      list = await sources.refresh()
    } catch {
      /* use the list we have */
    }
    const p = edit.current() // after the await: the newest project
    if (!p) return []
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

  return { useForShot, isInTimeline, applyNewer: apply, fill, statusOf, ignore }
}
