export type RevealScheduler = {
  setTimeout(callback: () => void, delayMs: number): unknown
  clearTimeout(handle: unknown): void
}

const browserScheduler: RevealScheduler = {
  setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
}

export function createRevealController(scheduler: RevealScheduler = browserScheduler, delayMs = 180) {
  let generation = 0
  let timer: unknown
  let activeIds: string[] | null = null

  function cancel() {
    generation++
    if (timer !== undefined) scheduler.clearTimeout(timer)
    timer = undefined
    activeIds = null
  }

  function start(assetIds: readonly string[], onReveal: (id: string) => void, onComplete: () => void) {
    const ids = [...new Set(assetIds)]
    // A second click on the current reveal must not replay already shown assets.
    if (activeIds && ids.length === activeIds.length && ids.every((id, i) => id === activeIds![i])) return
    cancel()
    activeIds = ids
    const run = generation
    let index = 0

    function revealNext() {
      if (run !== generation) return
      timer = undefined
      if (index < ids.length) onReveal(ids[index++])
      // Callbacks may cancel or start a different route synchronously.
      if (run !== generation) return
      if (index < ids.length) timer = scheduler.setTimeout(revealNext, delayMs)
      else {
        activeIds = null
        onComplete()
      }
    }

    timer = scheduler.setTimeout(revealNext, delayMs)
  }

  return { start, cancel }
}
