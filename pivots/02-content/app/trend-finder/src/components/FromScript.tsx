import { useState } from 'react'
import type { Shot } from '../types'
import { CameraTags } from './CameraTags'
import { MAX_SCRIPT, applyDraft, shotsFromScript, toPlanShot } from '../lib/shots'
import type { ApplyMode, DraftResult } from '../lib/shots'
import { t } from '../lib/i18n'

interface Props {
  shots: Shot[]
  // Tick "street interview" at the start when the plan's format reads like one.
  interviewGuess: boolean
  onShots: (next: Shot[]) => void
}

// "From script": paste a script, preview the AI's shot list, then replace or append. Nothing in the plan changes
// until one of those two buttons is pressed.
export function FromScript({ shots, interviewGuess, onShots }: Props) {
  const [open, setOpen] = useState(false)
  const [script, setScript] = useState('')
  const [interview, setInterview] = useState(interviewGuess)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<DraftResult | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const make = async () => {
    const text = script.trim()
    if (!text) return setError(t('shots.fs.err.empty'))
    if (text.length > MAX_SCRIPT) return setError(t('shots.fs.err.long', { max: MAX_SCRIPT }))
    setError('')
    setNotice('')
    setDraft(null)
    setBusy(true)
    try {
      setDraft(await shotsFromScript(text, interview))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const apply = (mode: ApplyMode) => {
    if (!draft) return
    onShots(applyDraft(shots, draft.shots, mode))
    setNotice(mode === 'replace' ? t('shots.fs.replaced') : t('shots.fs.appended', { n: draft.shots.length }))
    setDraft(null)
    setScript('')
    setOpen(false)
  }

  if (!open) {
    return (
      <div className="from-script-bar">
        <button type="button" className="btn btn-ghost" aria-expanded="false" aria-controls="from-script-panel" onClick={() => setOpen(true)}>
          {t('shots.fs.open')}
        </button>
        {notice && (
          <span className="small muted" role="status">
            {notice}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="from-script" id="from-script-panel">
      <div className="from-script-head">
        <h4>{t('shots.fs.title')}</h4>
        <button type="button" className="link-btn" onClick={() => setOpen(false)}>
          {t('shots.fs.close')}
        </button>
      </div>
      <p className="small muted">{t('shots.fs.hint')}</p>
      <label className="field">
        <span className="field-label">{t('shots.fs.scriptLabel')}</span>
        <textarea
          id="from-script-text"
          rows={6}
          value={script}
          placeholder={t('shots.fs.placeholder')}
          disabled={busy}
          onChange={(e) => setScript(e.target.value)}
        />
      </label>
      <p className={`small ${script.length > MAX_SCRIPT ? 'error' : 'muted'}`}>{t('shots.fs.count', { n: script.length, max: MAX_SCRIPT })}</p>
      <label className="from-script-check">
        <input id="from-script-interview" type="checkbox" checked={interview} disabled={busy} onChange={(e) => setInterview(e.target.checked)} />
        <span>{t('shots.fs.interview')}</span>
      </label>
      {interview && <p className="small muted">{t('shots.fs.interviewHint')}</p>}
      <div className="shot-actions">
        <button type="button" className="btn btn-primary btn-sm" disabled={busy || !script.trim()} onClick={() => void make()}>
          {busy ? t('shots.fs.making') : t('shots.fs.make')}
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {draft && (
        <div className="from-script-preview" role="region" aria-label={t('shots.fs.title')}>
          <h4>{draft.interview ? t('shots.fs.previewQuestions', { n: draft.shots.length }) : t('shots.fs.preview', { n: draft.shots.length })}</h4>
          {draft.source === 'demo' && <p className="small muted">{t('shots.fs.sample')}</p>}
          <ol className="from-script-list">
            {draft.shots.map((d, i) => {
              const s = toPlanShot(d)
              return (
                <li key={i}>
                  <span className="shot-time">{s.time}</span>
                  <span>
                    {s.shot}
                    {s.text && <span className="shot-text">{s.text}</span>}
                    <CameraTags shot={s} />
                  </span>
                </li>
              )
            })}
          </ol>
          <div className="shot-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => apply('replace')}>
              {shots.length > 0 ? t('shots.fs.replace', { n: shots.length }) : t('shots.fs.replaceEmpty')}
            </button>
            {shots.length > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => apply('append')}>
                {t('shots.fs.append')}
              </button>
            )}
            <button type="button" className="link-btn" onClick={() => setDraft(null)}>
              {t('shots.fs.discard')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
