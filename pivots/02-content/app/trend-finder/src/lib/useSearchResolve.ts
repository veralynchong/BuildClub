import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from './motion'
import { resolveMs, shouldPlayResolve } from './playMark'

// Keeps the loading card on screen for the play mark's ~2s resolve once a search's results are in.
// `card` is the search whose loading card is showing (null when none is); `ended` says the search ended with
// results (no error, and the person is still on its page). Nothing about the search changes: the results are
// already in state, and only sit under the card (playmark.css) until this returns null. Instant (cached)
// results, a failed or replaced search, and a hidden tab skip it.
export function useSearchResolve<S extends { startedAt: number }>(card: S | null, ended: boolean) {
  const reduced = usePrefersReducedMotion()
  const last = useRef<S | null>(null)
  const [resolving, setResolving] = useState<{ card: S; at: number } | null>(null)

  // A layout effect, so the frame where the card would vanish is never painted.
  useLayoutEffect(() => {
    const prev = last.current
    last.current = card
    if (card) {
      setResolving(null)
      return
    }
    if (!prev || !ended) return
    const at = Date.now()
    if (shouldPlayResolve(at - prev.startedAt, document.hidden)) setResolving({ card: prev, at })
  }, [card, ended])

  useEffect(() => {
    if (!resolving) return
    const id = window.setTimeout(() => setResolving(null), resolveMs(reduced))
    return () => clearTimeout(id)
  }, [resolving, reduced])

  return card ? null : resolving
}
