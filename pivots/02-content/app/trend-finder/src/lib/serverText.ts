import { areas, getActiveLang, t, type Key } from './i18n.ts'

// The backend answers in English: errors ("Save the shot list first.") and progress words ("Exporting"). Shown in
// another language they are looked up here by the whole sentence. A sentence with a number or name in it is a
// template in strings/server.ts ("{minutes}"); the values are carried over into the translation.
// A sentence the table doesn't know shows as it came (English), never blank or a key. backend/tests/test_server_text.py
// fails when the backend says something the table lacks.
const entries = Object.entries(areas.server.en) as [Key, string][]

const exact = new Map<string, Key>(entries.map(([key, text]) => [text, key]))

// "{name}" in an English sentence becomes a capture; the most specific template (most fixed text) is tried first.
const templates = entries
  .filter(([, text]) => /\{\w+\}/.test(text))
  .map(([key, text]) => {
    const names: string[] = []
    const source = text
      .split(/\{(\w+)\}/)
      .map((part, i) => {
        if (i % 2 === 0) return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        names.push(part)
        return '(.+?)'
      })
      .join('')
    return { key, names, re: new RegExp(`^${source}$`, 's'), fixed: text.replace(/\{\w+\}/g, '').length }
  })
  .sort((a, b) => b.fixed - a.fixed)

export function serverText(text: string | null | undefined): string {
  if (!text) return ''
  if (getActiveLang() === 'en') return text
  const key = exact.get(text)
  if (key) return t(key)
  for (const tpl of templates) {
    const m = tpl.re.exec(text)
    if (m) return t(tpl.key, Object.fromEntries(tpl.names.map((n, i) => [n, m[i + 1]])))
  }
  return text
}
