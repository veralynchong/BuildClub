import type { FlushResult } from '../editor/timeline.ts'

// Both the canvas transaction boundary and the editor's direct writes use this barrier.
// Work is registered synchronously, including its final save and failure rollback.
export function createOperationQueue() {
  let tail = Promise.resolve()
  let pending = 0
  return {
    run<T>(work: () => Promise<T>): Promise<T> {
      pending++
      const task = tail.then(work)
      tail = task.then(() => { pending-- }, () => { pending-- })
      return task
    },
    busy: () => pending > 0,
    async wait(): Promise<void> {
      let seen: Promise<void>
      do { seen = tail; await seen } while (tail !== seen)
    },
  }
}
export async function prepareCanvasLeave(queue: ReturnType<typeof createOperationQueue>, flushEditor: () => Promise<FlushResult>, flushCanvas: () => Promise<boolean>): Promise<boolean> {
  await queue.wait()
  const result = await flushEditor()
  if (result === 'failed' || result === 'stale') return false
  return flushCanvas()
}
