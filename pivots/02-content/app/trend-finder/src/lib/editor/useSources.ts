import { type ResourceInput } from '../canvas/resource.ts'
import { useCallback, useEffect, useState } from 'react'
import { t } from '../i18n.ts'
import { getSources } from './api.ts'
import type { SourceInfo } from './types.ts'

export interface SourcesHook {
  sources: SourceInfo[] | null
  error: string | null
  refresh: () => Promise<SourceInfo[]>
}

// The plan's footage with lengths (finished videos and takes). It is read again whenever `signature` changes
// (a version finished, a take came or went) and on demand, since a new file may not be probed yet.
export function useSources(ideaId: ResourceInput, signature: string): SourcesHook {
  const [sources, setSources] = useState<SourceInfo[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const s = await getSources(ideaId)
    setSources(s)
    setError(null)
    return s
  }, [ideaId])

  useEffect(() => {
    let cancelled = false
    getSources(ideaId).then(
      (s) => {
        if (cancelled) return
        setSources(s)
        setError(null)
      },
      (e: unknown) => !cancelled && setError(e instanceof Error ? e.message : t('editor.err.sources')),
    )
    return () => {
      cancelled = true
    }
  }, [ideaId, signature])

  return { sources, error, refresh }
}
