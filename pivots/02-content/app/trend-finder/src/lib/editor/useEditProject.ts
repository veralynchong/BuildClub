import { useCallback, useEffect, useRef, useState } from 'react'
import { getProject, putProject, StaleProject } from './api.ts'
import type { EditProject } from './types.ts'
import { flushOutcome, type FlushResult } from './timeline.ts'

export type EditSave = 'idle' | 'saving' | 'saved' | 'failed'
export const SAVE_DELAY_MS = 800

export interface EditHook {
  project: EditProject | null
  loadError: string | null
  save: EditSave
  stale: boolean
  update: (next: EditProject) => void
  flush: () => Promise<FlushResult> // saves now; resolves once nothing is waiting or in flight, with how it ended
  current: () => EditProject | null // the newest project, even before React has rendered it
  reload: () => void
}

// The edit project of a plan, loaded once and saved 800 ms after the last change. It lives above the drawer so the
// canvas nodes (and the export button) can read and change it while the drawer is closed.
export function useEditProject(ideaId: string, readOnly: boolean): EditHook {
  const [project, setProject] = useState<EditProject | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [save, setSave] = useState<EditSave>('idle')
  const [stale, setStale] = useState(false)
  const [loadKey, setLoadKey] = useState(0)

  const latest = useRef<EditProject | null>(null)
  const version = useRef(0)
  const dirty = useRef(false)
  const blocked = useRef(false)
  const inflight = useRef<Promise<void> | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const mounted = useRef(true)
  const readOnlyRef = useRef(readOnly)
  useEffect(() => {
    readOnlyRef.current = readOnly
  })

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const run = useCallback((): Promise<void> => {
    if (inflight.current) return inflight.current
    if (!dirty.current || blocked.current || readOnlyRef.current || !latest.current) return Promise.resolve()
    const snap = latest.current
    const p = (async () => {
      if (mounted.current) setSave('saving')
      try {
        version.current = await putProject(ideaId, version.current, snap)
        if (latest.current === snap) dirty.current = false
        if (mounted.current) setSave('saved')
      } catch (e) {
        if (e instanceof StaleProject) {
          blocked.current = true
          if (mounted.current) setStale(true)
        } else if (mounted.current) setSave('failed')
        return
      } finally {
        inflight.current = null
      }
      if (dirty.current) await run() // changed while saving
    })()
    inflight.current = p
    return p
  }, [ideaId])

  useEffect(() => {
    let cancelled = false
    blocked.current = false
    dirty.current = false
    getProject(ideaId).then(
      (r) => {
        if (cancelled) return
        // A project that was never saved (version 0) starts with captions on. It is saved with the next edit or
        // export; saved projects keep what they have.
        const fresh = r.version === 0 && !readOnlyRef.current
        const loaded = fresh ? { ...r.project, captions: { enabled: true } } : r.project
        latest.current = loaded
        dirty.current = fresh
        version.current = r.version
        setProject(loaded)
        setLoadError(null)
        setStale(false)
        setSave('idle')
      },
      (e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e))
      },
    )
    return () => {
      cancelled = true
    }
  }, [ideaId, loadKey])

  const update = useCallback(
    (next: EditProject) => {
      if (readOnlyRef.current || blocked.current || next === latest.current) return
      latest.current = next
      dirty.current = true
      setProject(next)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => void run(), SAVE_DELAY_MS)
    },
    [run],
  )

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    while (inflight.current || (dirty.current && !blocked.current && !readOnlyRef.current)) {
      const before = version.current
      await run()
      if (!inflight.current && dirty.current && version.current === before) break // the save failed: don't spin
    }
    return flushOutcome({ dirty: dirty.current, blocked: blocked.current, readOnly: readOnlyRef.current })
  }, [run])

  // Leaving the screen with an unsaved change: save it now.
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      void run()
    },
    [run],
  )

  const reload = useCallback(() => {
    clearTimeout(timer.current)
    setProject(null)
    setLoadKey((k) => k + 1)
  }, [])

  const current = useCallback(() => latest.current, [])

  return { project, loadError, save, stale, update, flush, current, reload }
}
