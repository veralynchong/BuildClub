import { useEffect } from 'react'
import { analysing, listTakes, type Take } from '../takes.ts'

const POLL_MS = 2500

// While any take is still being looked at, read the plan's takes again every few seconds; it stops by itself once none is.
export function useTakeAnalysis(ideaId: string | null, takes: Take[], onTakes: (takes: Take[]) => void): void {
  const waiting = !!ideaId && takes.some(analysing)
  useEffect(() => {
    if (!waiting || !ideaId) return
    let live = true
    const timer = setInterval(() => {
      listTakes(ideaId).then((list) => { if (live) onTakes(list) }).catch(() => undefined)
    }, POLL_MS)
    return () => { live = false; clearInterval(timer) }
  }, [waiting, ideaId, onTakes])
}
