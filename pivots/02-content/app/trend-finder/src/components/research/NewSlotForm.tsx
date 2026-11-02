import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Platform } from '../../types'
import type { LinkInput } from '../../lib/research'
import { t } from '../../lib/i18n'
import { platformName } from '../../lib/metrics'
import { PlatformLogo } from '../PlatformToggles'
import { accountFromUrl, parseCount, platformFromUrl, toUrl } from './sheet'

export interface NewVideo {
  number: number
  topic: string
  dueDate?: string
  // Reference videos to file under it straight away (may be empty).
  refs: LinkInput[]
}

interface Props {
  // This client's video numbers already in use; the form suggests the next one and refuses a taken one.
  taken: number[]
  platforms: Platform[]
  onCreate: (video: NewVideo) => void
  onCancel: () => void
}

interface RefDraft {
  key: number
  url: string
  platform: Platform
  account: string
  followers: string
  views: string
}

type RefErrors = Partial<Record<'url' | 'followers' | 'views', string>>
type Errors = { number?: string; topic?: string; refs: Record<number, RefErrors> }

// "+ Add video": one more video the client is paying for, with its number, title, optional due date and any
// reference videos already found. Only the title is needed; blank reference rows are skipped.
export function NewSlotForm(p: Props) {
  const id = useId()
  const choices: Platform[] = p.platforms.length ? p.platforms : ['tiktok', 'instagram', 'youtube']
  const next = p.taken.reduce((n, x) => (Number.isFinite(x) ? Math.max(n, x) : n), 0) + 1
  const keys = useRef(1)
  const blank = (): RefDraft => ({ key: keys.current++, url: '', platform: choices[0], account: '', followers: '', views: '' })

  const [number, setNumber] = useState(String(next))
  const [topic, setTopic] = useState('')
  const [due, setDue] = useState('')
  const [refs, setRefs] = useState<RefDraft[]>(() => [blank()])
  const [errors, setErrors] = useState<Errors>({ refs: {} })

  const setRef = (key: number, patch: Partial<RefDraft>) =>
    setRefs((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const isBlank = (r: RefDraft) => !r.url.trim() && !r.account.trim() && !r.followers.trim() && !r.views.trim()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const found: Errors = { refs: {} }
    let firstBad: string | null = null
    const mark = (field: string) => (firstBad ??= field)

    const n = Number(number)
    if (!number.trim() || !Number.isInteger(n) || n < 1) {
      found.number = t('research.slotForm.numberError')
      mark(`${id}-number`)
    } else if (p.taken.includes(n)) {
      found.number = t('research.slotForm.numberTaken', { n })
      mark(`${id}-number`)
    }
    if (!topic.trim()) {
      found.topic = t('research.slotForm.topicError')
      mark(`${id}-topic`)
    }

    const out: LinkInput[] = []
    for (const r of refs) {
      if (isBlank(r)) continue
      const link = toUrl(r.url)
      const f = parseCount(r.followers)
      const v = parseCount(r.views)
      const re: RefErrors = {}
      if (!link) re.url = t('research.link.urlError')
      if (f === null) re.followers = t('research.link.numberError')
      if (v === null) re.views = t('research.link.numberError')
      if (re.url || re.followers || re.views) {
        found.refs[r.key] = re
        mark(`${id}-${r.key}-${re.url ? 'url' : re.followers ? 'followers' : 'views'}`)
        continue
      }
      out.push({
        url: link!.href,
        platform: platformFromUrl(r.url) ?? r.platform,
        account: r.account.trim() || accountFromUrl(r.url),
        followers: f ?? 0,
        views: v ?? 0,
        hook: '',
        keywords: [],
        notes: '',
      })
    }

    setErrors(found)
    if (firstBad) {
      document.getElementById(firstBad)?.focus()
      return
    }
    p.onCreate({ number: n, topic: topic.trim(), dueDate: due || undefined, refs: out })
  }

  const err = (msg: string | undefined, errId: string) =>
    msg ? (
      <span className="field-error" id={errId}>
        {msg}
      </span>
    ) : null
  const errProps = (msg: string | undefined, errId: string) =>
    msg ? { 'aria-invalid': true, 'aria-describedby': errId } : {}
  const optional = <span className="rs-optional">{` (${t('research.link.optional')})`}</span>

  return (
    <form
      className="rs-link rs-slot-form"
      aria-labelledby={`${id}-title`}
      noValidate
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !e.nativeEvent.isComposing) {
          e.preventDefault()
          p.onCancel()
        }
      }}
    >
      <div className="rs-link-head">
        <h2 id={`${id}-title`}>{t('research.slotForm.title')}</h2>
        <p className="muted small">{t('research.slotForm.intro')}</p>
      </div>

      <div className="rs-slot-form-grid">
        <label className="field" htmlFor={`${id}-number`}>
          <span className="field-label">{t('research.slotForm.number')}</span>
          <input
            id={`${id}-number`}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            required
            value={number}
            onChange={(e) => {
              setNumber(e.target.value)
              setErrors((x) => ({ ...x, number: undefined }))
            }}
            {...errProps(errors.number, `${id}-number-error`)}
          />
          {err(errors.number, `${id}-number-error`)}
        </label>
        <label className="field" htmlFor={`${id}-topic`}>
          <span className="field-label">{t('research.slotForm.topic')}</span>
          <input
            id={`${id}-topic`}
            type="text"
            autoFocus
            required
            placeholder={t('research.slotForm.topicPlaceholder')}
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value)
              setErrors((x) => ({ ...x, topic: undefined }))
            }}
            {...errProps(errors.topic, `${id}-topic-error`)}
          />
          {err(errors.topic, `${id}-topic-error`)}
        </label>
        <label className="field" htmlFor={`${id}-due`}>
          <span className="field-label">
            {t('research.slotForm.due')}
            {optional}
          </span>
          <input id={`${id}-due`} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
      </div>

      <fieldset className="rs-refs">
        <legend className="field-label">
          {t('research.slotForm.refs')}
          {optional}
        </legend>
        <p className="muted small">{t('research.slotForm.refsHint')}</p>
        <ol className="rs-refs-list">
          {refs.map((r, i) => {
            const re = errors.refs[r.key] ?? {}
            const found = platformFromUrl(r.url)
            const fid = (f: string) => `${id}-${r.key}-${f}`
            return (
              <li key={r.key} className="rs-ref-row">
                <span className="rs-ref-no" aria-hidden="true">
                  {i + 1}
                </span>
                <label className="field rs-ref-url">
                  <span className="field-label">{t('research.slotForm.refLink', { n: i + 1 })}</span>
                  <input
                    id={fid('url')}
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    placeholder={t('research.link.urlPlaceholder')}
                    value={r.url}
                    onChange={(e) => setRef(r.key, { url: e.target.value })}
                    {...errProps(re.url, fid('url-error'))}
                  />
                  {err(re.url, fid('url-error'))}
                </label>
                {found ? (
                  <div className="field">
                    <span className="field-label">{t('research.link.platform')}</span>
                    <span className="rs-link-found">
                      <PlatformLogo platform={found} size={20} />
                      {platformName[found]}
                    </span>
                  </div>
                ) : (
                  <label className="field">
                    <span className="field-label">{t('research.link.platform')}</span>
                    <select value={r.platform} onChange={(e) => setRef(r.key, { platform: e.target.value as Platform })}>
                      {choices.map((c) => (
                        <option key={c} value={c}>
                          {platformName[c]}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="field">
                  <span className="field-label">{t('research.link.account')}</span>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder={t('research.link.accountPlaceholder')}
                    value={r.account}
                    onChange={(e) => setRef(r.key, { account: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-label">{t('research.link.followers')}</span>
                  <input
                    id={fid('followers')}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="12k"
                    value={r.followers}
                    onChange={(e) => setRef(r.key, { followers: e.target.value })}
                    {...errProps(re.followers, fid('followers-error'))}
                  />
                  {err(re.followers, fid('followers-error'))}
                </label>
                <label className="field">
                  <span className="field-label">{t('research.link.views')}</span>
                  <input
                    id={fid('views')}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="300k"
                    value={r.views}
                    onChange={(e) => setRef(r.key, { views: e.target.value })}
                    {...errProps(re.views, fid('views-error'))}
                  />
                  {err(re.views, fid('views-error'))}
                </label>
                {refs.length > 1 && (
                  <button
                    type="button"
                    className="rs-x rs-ref-remove"
                    aria-label={t('research.slotForm.removeRefAria', { n: i + 1 })}
                    title={t('research.remove')}
                    onClick={() => setRefs((prev) => prev.filter((x) => x.key !== r.key))}
                  >
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                )}
              </li>
            )
          })}
        </ol>
        <button
          type="button"
          className="btn btn-ghost rs-ref-add"
          onClick={() => {
            const row = blank()
            setRefs((prev) => [...prev, row])
            requestAnimationFrame(() => document.getElementById(`${id}-${row.key}-url`)?.focus())
          }}
        >
          <span aria-hidden="true">+</span> {t('research.slotForm.addRef')}
        </button>
      </fieldset>

      <div className="rs-link-actions">
        <button type="submit" className="btn btn-primary">
          {t('research.slotForm.save')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={p.onCancel}>
          {t('research.link.cancel')}
        </button>
      </div>
    </form>
  )
}
