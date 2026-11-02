import { useEffect, useState } from 'react'
import { elapsedSeconds } from './searchStatus'

// Whole seconds since `startedAt`, ticking once a second. Counting from the start time (not from mount)
// keeps the number right when the person leaves the page and comes back while the search runs.
export function useElapsed(startedAt: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return elapsedSeconds(startedAt, now)
}
