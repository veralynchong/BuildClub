// Small pure helpers for the background search (kept apart from React so they can be unit-tested).

// Whole seconds since the search started; never negative if the clock moved.
export const elapsedSeconds = (startedAt: number, now: number) => Math.max(0, Math.floor((now - startedAt) / 1000))

// A finished search takes over the screen only when the person is on that client's Find ideas / results page.
// Anywhere else (Home, Plans, another client, ...) it waits behind a toast, so nothing jumps under them.
export const isOnSearchPage = (at: { view: string; workspace: string }, clientId: string) =>
  at.workspace === clientId && (at.view === 'search' || at.view === 'results')
