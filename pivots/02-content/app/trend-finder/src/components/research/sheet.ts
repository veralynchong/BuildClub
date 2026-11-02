import type { Platform } from '../../types'
import type { ResearchEntry, ResearchStatus } from '../../lib/research.ts'
import { viewsPerFollower } from '../../lib/research.ts'

// Plain helpers for the Research sheet: link → platform, typed numbers and keywords, sorting and CSV.

// The platform a pasted link is from, when the address says so.
export function platformFromUrl(raw: string): Platform | null {
  const url = toUrl(raw)
  if (!url) return null
  const host = url.hostname.toLowerCase().replace(/^www\.|^m\./, '')
  const is = (d: string) => host === d || host.endsWith(`.${d}`)
  if (is('tiktok.com')) return 'tiktok'
  if (is('instagram.com')) return 'instagram'
  if (is('youtube.com') || is('youtu.be')) return 'youtube'
  return null
}

// The account a pasted link names ("@handle" in TikTok / YouTube links, the first path part on Instagram), or
// '' when it doesn't say.
export function accountFromUrl(raw: string): string {
  const url = toUrl(raw)
  if (!url) return ''
  const at = url.pathname.match(/\/@([\w.-]+)/)
  if (at) return `@${at[1]}`
  if (platformFromUrl(raw) === 'instagram') {
    const first = url.pathname.split('/').filter(Boolean)[0]
    if (first && !['p', 'reel', 'reels', 'tv', 'stories', 'explore'].includes(first)) return `@${first}`
  }
  return ''
}

// A web address from what was pasted, adding https:// when it is missing. Null when it isn't one.
export function toUrl(raw: string): URL | null {
  const s = raw.trim()
  if (!s || /\s/.test(s)) return null
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (!url.hostname.includes('.')) return null
    return url
  } catch {
    return null
  }
}

// "12,400", "12k", "1.2M" → a number. Blank → 0. Null when it isn't a number.
export function parseCount(raw: string): number | null {
  const s = raw.trim().replace(/[,\s]/g, '').toLowerCase()
  if (!s) return 0
  const m = s.match(/^(\d+(?:\.\d+)?)([km萬万]?)$/)
  if (!m) return null
  const mult = { '': 1, k: 1_000, m: 1_000_000, 萬: 10_000, 万: 10_000 }[m[2]] ?? 1
  return Math.round(Number(m[1]) * mult)
}

// "tofu, recipe，easy、snack" → ['tofu', 'recipe', 'easy', 'snack'] (no blanks, no repeats).
export const parseKeywords = (raw: string): string[] => [
  ...new Set(
    raw
      .split(/[,，、\n]/)
      .map((k) => k.trim())
      .filter(Boolean),
  ),
]

export const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])

export type SortKey =
  | 'account'
  | 'platform'
  | 'followers'
  | 'views'
  | 'ratio'
  | 'keywords'
  | 'hook'
  | 'notes'
  | 'status'
  | 'loggedAt'
export interface Sort {
  key: SortKey
  dir: 'asc' | 'desc'
}
export const DEFAULT_SORT: Sort = { key: 'loggedAt', dir: 'desc' }

// Numbers read best biggest first; words A to Z.
export const firstDir = (key: SortKey): Sort['dir'] =>
  key === 'followers' || key === 'views' || key === 'ratio' || key === 'loggedAt' ? 'desc' : 'asc'

export const STATUSES: ResearchStatus[] = ['none', 'planning', 'waiting', 'approved', 'filming', 'editing', 'posted']

export function sortRows(
  rows: ResearchEntry[],
  sort: Sort,
  statusOf: (e: ResearchEntry) => ResearchStatus,
  lang: string,
): ResearchEntry[] {
  const text = (a: string, b: string) => {
    // Empty text goes last whichever way you sort.
    if (!a !== !b) return !a ? 1 : -1
    return a.localeCompare(b, lang, { sensitivity: 'base', numeric: true })
  }
  const sign = sort.dir === 'asc' ? 1 : -1
  const cmp = (a: ResearchEntry, b: ResearchEntry): number => {
    switch (sort.key) {
      case 'account':
        return sign * text(a.account, b.account)
      case 'platform':
        return sign * text(a.platform, b.platform)
      case 'followers':
        return sign * (a.followers - b.followers)
      case 'views':
        return sign * (a.views - b.views)
      case 'ratio': {
        const ra = viewsPerFollower(a)
        const rb = viewsPerFollower(b)
        // No followers: always last.
        if (ra === null || rb === null) return ra === rb ? 0 : ra === null ? 1 : -1
        return sign * (ra - rb)
      }
      case 'keywords':
        return sign * text(a.keywords.join(', '), b.keywords.join(', '))
      case 'hook':
        return sign * text(a.hook, b.hook)
      case 'notes':
        return sign * text(a.notes, b.notes)
      case 'status':
        return sign * (STATUSES.indexOf(statusOf(a)) - STATUSES.indexOf(statusOf(b)))
      case 'loggedAt':
        return sign * (a.loggedAt - b.loggedAt)
    }
  }
  // Ties: newest first, so the order never jumps around.
  return [...rows].sort((a, b) => cmp(a, b) || b.loggedAt - a.loggedAt || a.id.localeCompare(b.id))
}

export function matches(e: ResearchEntry, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [e.account, e.hook, e.notes, ...e.keywords].some((s) => s.toLowerCase().includes(q))
}

// One CSV cell: quoted when it holds a quote, comma or line break. Text that a spreadsheet would run as a formula
// (starting with = + - @) gets a leading apostrophe so it stays text.
export function csvCell(value: string | number): string {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  let s = value
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const toCsv = (rows: (string | number)[][]): string => rows.map((r) => r.map(csvCell).join(',')).join('\r\n')

// 2026-11-02, in local time.
export function isoDate(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// "Evergreen Foods" → "evergreen-foods"; falls back when the name has no Latin letters (e.g. Chinese).
export function fileSlug(name: string, fallback: string): string {
  const slug = (s: string) =>
    s
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  return slug(name) || slug(fallback) || 'client'
}

// Saves text as a file in the browser. The byte-order mark makes Excel read the file as UTF-8 (Chinese text).
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}
