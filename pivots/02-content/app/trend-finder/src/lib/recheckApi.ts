import type { Video } from '../types.ts'
import { t } from './i18n.ts'
import type { Recheck } from './numbers.ts'

// The newest result per video, so a card and the open panel for the same video show the same thing.
const seen = new Map<string, Recheck | null>()
const keyOf = (v: Video) => `${v.platform}:${v.id}`
export const cachedRecheck = (v: Video): Recheck | null | undefined => seen.get(keyOf(v))

// What was saved on the server for this video (null when it was never re-checked).
export async function loadRecheck(v: Video): Promise<Recheck | null> {
  try {
    const r = await fetch(`/api/recheck?platform=${encodeURIComponent(v.platform)}&id=${encodeURIComponent(v.id)}`)
    const result: Recheck | null = r.ok ? ((await r.json()).result ?? null) : null
    seen.set(keyOf(v), result)
    return result
  } catch {
    return null
  }
}

// Asks the server to fetch fresh counts. Throws an Error whose message is fit to show.
export async function runRecheck(v: Video): Promise<Recheck> {
  const old = { views: v.views, likes: v.likes ?? null, comments: v.commentCount ?? null, followers: v.followers > 0 ? v.followers : null }
  let body: { result?: Recheck; error?: string } = {}
  let ok = false
  try {
    const r = await fetch('/api/recheck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: v.platform, id: v.id, url: v.url, old }),
    })
    ok = r.ok
    body = await r.json().catch(() => ({}))
  } catch {
    /* offline: handled below */
  }
  if (!ok || !body.result) throw new Error(body.error ? t('find.numbers.failed', { message: body.error }) : t('find.numbers.failedGeneric'))
  seen.set(keyOf(v), body.result)
  return body.result
}
