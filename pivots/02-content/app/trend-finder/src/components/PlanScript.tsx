import type { PlanScript as Script, ScriptLine } from '../types'
import { editScriptLine } from '../lib/script'
import { t } from '../lib/i18n'

interface Props {
  script: Script
  // The shot list changed since it was written.
  stale: boolean
  // False when the plan is waiting or approved: the script shows, nothing changes.
  editable: boolean
  onChange: (next: Script) => void
  // "Write the script again", shown with the out-of-date note.
  onRewrite?: () => void
}

// The plan's script, under the shot list: one card per shot, with what is said and the words on screen.
// Same cards as the shot list (drawer-plan.css "shot-frame").
export function PlanScript({ script, stale, editable, onChange, onRewrite }: Props) {
  const set = (i: number, patch: Partial<ScriptLine>) => onChange(editScriptLine(script, i, patch))
  return (
    <section className="plan-sec plan-script" id="plan-script" aria-labelledby="plan-script-title">
      <header className="plan-sec-head">
        <h2 id="plan-script-title">{t('plan.script.title')}</h2>
      </header>
      {stale && (
        <p className="plan-sec-note plan-script-stale" role="status">
          {t('plan.script.stale')}
          {editable && onRewrite && (
            <>
              {' '}
              <button type="button" className="link-btn" onClick={onRewrite}>
                {t('plan.script.rewrite')}
              </button>
            </>
          )}
        </p>
      )}
      <ol className="shot-frames script-frames">
        {script.lines.map((l, i) => (
          <li key={i} className="shot-frame script-frame">
            <span className="shot-no">{t('plan.screen.shotNo', { n: i + 1 })}</span>
            {editable ? (
              <>
                <label className="script-field">
                  <span className="script-label">{t('plan.script.say')}</span>
                  <textarea
                    className="shot-frame-text"
                    rows={2}
                    aria-label={t('plan.script.sayAria', { n: i + 1 })}
                    value={l.say}
                    onChange={(e) => set(i, { say: e.target.value })}
                  />
                </label>
                <label className="script-field">
                  <span className="script-label">{t('plan.script.onScreen')}</span>
                  <textarea
                    className="shot-frame-text script-onscreen"
                    rows={1}
                    aria-label={t('plan.script.onScreenAria', { n: i + 1 })}
                    placeholder={t('plan.script.noText')}
                    value={l.onScreen}
                    onChange={(e) => set(i, { onScreen: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.preventDefault()
                    }}
                  />
                </label>
              </>
            ) : (
              <>
                <span className="script-field">
                  <span className="script-label">{t('plan.script.say')}</span>
                  <span className="shot-frame-read">{l.say}</span>
                </span>
                {l.onScreen && (
                  <span className="script-field">
                    <span className="script-label">{t('plan.script.onScreen')}</span>
                    <span className="shot-frame-read">{l.onScreen}</span>
                  </span>
                )}
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
