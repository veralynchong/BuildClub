import { useCallback, useEffect, useState } from 'react'
import type { Take } from '../lib/takes'
import { checkFile, listTakes, uploadTake } from '../lib/takes'

export interface TakesState {
  takes: Take[] | null
  loadError: boolean
  // Shots with an upload still running; several shots can upload at once.
  busy: ReadonlySet<number>
  errors: Record<number, string>
  // Runs a take change (choose, delete) and keeps the list it returns.
  run: (shot: number, action: () => Promise<Take[]>) => Promise<void>
  upload: (shot: number, file: File) => Promise<void>
}

// A plan's takes and the one upload path for them, shared by the plan page checklist and the Storyboard shot list.
export function useTakes(ideaId: string | null): TakesState {
  const [takes, setTakes] = useState<Take[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [busy, setBusy] = useState<ReadonlySet<number>>(new Set())
  const [errors, setErrors] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!ideaId) return
    let live = true
    listTakes(ideaId)
      .then((t) => live && setTakes(t))
      .catch(() => live && setLoadError(true))
    return () => {
      live = false
    }
  }, [ideaId])

  const setError = useCallback(
    (shot: number, text?: string) =>
      setErrors((e) => {
        const next = { ...e }
        if (text) next[shot] = text
        else delete next[shot]
        return next
      }),
    [],
  )

  const run = useCallback(
    async (shot: number, action: () => Promise<Take[]>) => {
      setError(shot)
      try {
        setTakes(await action())
      } catch (e) {
        setError(shot, (e as Error).message)
      }
    },
    [setError],
  )

  const upload = useCallback(
    async (shot: number, file: File) => {
      if (!ideaId) return
      const problem = checkFile(file)
      if (problem) return setError(shot, problem)
      setError(shot)
      setBusy((b) => new Set(b).add(shot))
      try {
        const added = await uploadTake(ideaId, shot, file)
        // Add to the list as it is now: choices and deletes made during a long upload must not be undone.
        setTakes((prev) => [...(prev ?? []), added])
      } catch (e) {
        setError(shot, (e as Error).message)
      } finally {
        setBusy((b) => {
          const next = new Set(b)
          next.delete(shot)
          return next
        })
      }
    },
    [ideaId, setError],
  )

  return { takes, loadError, busy, errors, run, upload }
}
