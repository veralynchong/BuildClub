import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { Platform } from '../../types'
import type { LinkInput } from '../../lib/research'
import { t } from '../../lib/i18n'
import { platformName } from '../../lib/metrics'
import { PlatformLogo } from '../PlatformToggles'
import { accountFromUrl, parseCount, parseKeywords, platformFromUrl, toUrl } from './sheet'

interface Props {
  platforms: Platform[]
  onAdd: (input: LinkInput) => void
  onCancel: () => void
}

type Errors = Partial<Record<'url' | 'followers' | 'views', string>>

// "Add from link": an inline panel for a video found outside the app (e.g. on a phone). Only the link is needed.
export function AddFromLink(p: Props) {
  const id = useId()
  const choices: Platform[] = p.platforms.length ? p.platforms : ['tiktok', 'instagram', 'youtube']
  const [url, setUrl] = useState('')
  const [picked, setPicked] = useState<Platform>(choices[0])
  const [account, setAccount] = useState('')
  const [followers, setFollowers] = useState('')
  const [views, setViews] = useState('')
  const [hook, setHook] = useState('')
  const [keywords, setKeywords] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Errors>({})

  const found = platformFromUrl(url)
  const platform = found ?? picked

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const link = toUrl(url)
    const f = parseCount(followers)
    const v = parseCount(views)
    const next: Errors = {}
    if (!link) next.url = t('research.link.urlError')
    if (f === null) next.followers = t('research.link.numberError')
    if (v === null) next.views = t('research.link.numberError')
    setErrors(next)
    if (!link || f === null || v === null) {
      const first = next.url ? 'url' : next.followers ? 'followers' : 'views'
      document.getElementById(`${id}-${first}`)?.focus()
      return
    }
    p.onAdd({
      url: link.href,
      platform,
      account: account.trim() || accountFromUrl(url),
      followers: f,
      views: v,
      hook: hook.trim(),
      keywords: parseKeywords(keywords),
      notes: notes.trim(),
    })
  }

  const optional = <span className="rs-optional">{` (${t('research.link.optional')})`}</span>
  const errorOf = (k: keyof Errors) =>
    errors[k] ? (
      <span className="field-error" id={`${id}-${k}-error`}>
        {errors[k]}
      </span>
    ) : null
  const errorProps = (k: keyof Errors) =>
    errors[k] ? { 'aria-invalid': true, 'aria-describedby': `${id}-${k}-error` } : {}

  return (
    <form
      className="rs-link"
      aria-labelledby={`${id}-title`}
      noValidate
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          p.onCancel()
        }
      }}
    >
      <div className="rs-link-head">
        <h2 id={`${id}-title`}>{t('research.link.title')}</h2>
        <p className="muted small">{t('research.link.intro')}</p>
      </div>

      <div className="rs-link-grid">
        <label className="field field-wide">
          <span className="field-label">{t('research.link.url')}</span>
          <input
            id={`${id}-url`}
            type="url"
            inputMode="url"
            autoComplete="off"
            required
            autoFocus
            placeholder={t('research.link.urlPlaceholder')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            {...errorProps('url')}
          />
          {errorOf('url')}
        </label>

        {found ? (
          <div className="field">
            <span className="field-label">{t('research.link.platform')}</span>
            <span className="rs-link-found">
              <PlatformLogo platform={found} size={20} />
              {t('research.link.platformFound', { platform: platformName[found] })}
            </span>
          </div>
        ) : (
          <label className="field">
            <span className="field-label">{t('research.link.platform')}</span>
            <select value={picked} onChange={(e) => setPicked(e.target.value as Platform)}>
              {choices.map((c) => (
                <option key={c} value={c}>
                  {platformName[c]}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="field">
          <span className="field-label">
            {t('research.link.account')}
            {optional}
          </span>
          <input
            type="text"
            autoComplete="off"
            placeholder={t('research.link.accountPlaceholder')}
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">
            {t('research.link.followers')}
            {optional}
          </span>
          <input
            id={`${id}-followers`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={t('research.link.numberHint')}
            value={followers}
            onChange={(e) => setFollowers(e.target.value)}
            {...errorProps('followers')}
          />
          {errorOf('followers')}
        </label>

        <label className="field">
          <span className="field-label">
            {t('research.link.views')}
            {optional}
          </span>
          <input
            id={`${id}-views`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={t('research.link.numberHint')}
            value={views}
            onChange={(e) => setViews(e.target.value)}
            {...errorProps('views')}
          />
          {errorOf('views')}
        </label>

        <label className="field field-wide">
          <span className="field-label">
            {t('research.link.hook')}
            {optional}
          </span>
          <input type="text" autoComplete="off" value={hook} onChange={(e) => setHook(e.target.value)} />
        </label>

        <label className="field field-wide">
          <span className="field-label">
            {t('research.link.keywords')}
            {optional}
          </span>
          <input
            type="text"
            autoComplete="off"
            placeholder={t('research.edit.keywordsHint')}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </label>

        <label className="field field-wide">
          <span className="field-label">
            {t('research.link.notes')}
            {optional}
          </span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>

      <div className="rs-link-actions">
        <button type="submit" className="btn btn-primary">
          {t('research.link.save')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={p.onCancel}>
          {t('research.link.cancel')}
        </button>
      </div>
    </form>
  )
}
