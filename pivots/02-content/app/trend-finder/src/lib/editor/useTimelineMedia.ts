import { useEffect, useState } from 'react'
import type { Take } from '../takes.ts'
import { getClipSuggestions, getTakeMedia, type CleanupItem, type TakeMedia } from './aiApi.ts'
import { PAD_DEFAULT } from './aiEdit.ts'
import { peaksFromSamples, type Peaks } from './marks.ts'

// What the timeline draws on the takes it holds: each take's filmstrip and waveform, and its clean-up suggestions for the
// whole take (the clips show the part inside their trim). Asked for once per take and analysis run: answers are kept by
// plan, take and the run's time, so trimming, moving or re-rendering never asks again, and a re-run analysis is fetched anew.

export type TakeLook = TakeMedia & { version: string }

const media = new Map<string, Promise<TakeLook | null>>()
const cleanup = new Map<string, Promise<CleanupItem[] | null>>()

const versionOf = (take: Take): string | null =>
  take.analysis?.status === 'done' ? String(take.analysis.updatedAt ?? 'done') : null

export function useTimelineMedia(planId: string | null, takes: Take[], takeIds: string[]): { looks: Record<string, TakeLook>; items: Record<string, CleanupItem[]> } {
  const wanted = planId
    ? [...new Set(takeIds)].flatMap((id) => {
        const take = takes.find((x) => x.id === id)
        const version = take ? versionOf(take) : null
        return take && version ? [{ id, version, duration: take.analysis?.summary?.duration ?? null, key: `${planId}|${id}|${version}` }] : []
      })
    : []
  const sig = wanted.map((w) => w.key).join(',')
  const [looks, setLooks] = useState<Record<string, TakeLook>>({})
  const [items, setItems] = useState<Record<string, CleanupItem[]>>({})
  useEffect(() => {
    if (!planId) return
    let live = true
    for (const w of wanted) {
      if (!media.has(w.key)) media.set(w.key, getTakeMedia(planId, w.id).then((m) => ({ ...m, version: w.version }), () => null))
      if (!cleanup.has(w.key) && w.duration) {
        cleanup.set(w.key, getClipSuggestions(planId, w.id, 0, w.duration, PAD_DEFAULT).then((s) => s.cleanup, () => null))
      }
      void media.get(w.key)?.then((m) => { if (live && m) setLooks((cur) => (cur[w.id] === m ? cur : { ...cur, [w.id]: m })) })
      void cleanup.get(w.key)?.then((list) => { if (live && list) setItems((cur) => (cur[w.id] === list ? cur : { ...cur, [w.id]: list })) })
    }
    return () => { live = false }
    // `sig` names every take and run in `wanted`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, sig])
  return { looks, items }
}

// The music file's waveform, worked out in the browser (no server round trip): decoded once per file.
const music = new Map<string, Promise<Peaks | null>>()
const MUSIC_RATE = 20 // buckets a second; music is drawn coarser than speech

// Music is drawn to its own loudest moment, so a quietly mastered file still shows its shape; the volume scales it after.
const normalised = (p: Peaks): Peaks => {
  const top = Math.max(0, ...p.values)
  return top > 0 ? { ...p, values: p.values.map((v) => Math.round((v / top) * 100) / 100) } : p
}

export function useMusicPeaks(url: string | null): Peaks | null {
  const [peaks, setPeaks] = useState<{ url: string; peaks: Peaks } | null>(null)
  useEffect(() => {
    if (!url || typeof OfflineAudioContext === 'undefined') return
    if (!music.has(url)) {
      music.set(url, fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((buf) => new OfflineAudioContext(1, 1, 44100).decodeAudioData(buf))
        .then((audio) => normalised(peaksFromSamples(audio.getChannelData(0), audio.sampleRate, MUSIC_RATE)), () => null))
    }
    let live = true
    void music.get(url)?.then((p) => { if (live && p) setPeaks({ url, peaks: p }) })
    return () => { live = false }
  }, [url])
  return peaks && peaks.url === url ? peaks.peaks : null
}
