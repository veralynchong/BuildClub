import { useEffect, useRef, useState } from 'react'
import type { Client, Format, Shot, Video } from '../types'
import { pickHook, suggestedHooks, withHookOptions } from '../lib/hooks'
import { writeShotScript } from '../lib/storyboard'
import { t } from '../lib/i18n'
import { emotionKey, hookEmotion } from '../lib/hookEmotion'
import type { HookEmotion } from '../lib/hookEmotion'

interface Props {
  ideaId: string
  // True when the plan has its own saved shots (idea.shots); the writer route reads the saved plan.
  saved: boolean
  video: Video
  format: Format
  client: Client
  shots: Shot[]
  // False when the plan is waiting or approved: the openings show, nothing changes.
  editable: boolean
  // Saves the shots through the plan's normal save path.
  onShots: (next: Shot[]) => void
}

// The plan is saved a moment after each change; the writer route reads the saved plan, so wait for it
// (same wait as StoryboardSection).
const SAVE_SETTLE_MS = 800
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// What the viewer feels: a fixed label, not a control (no hover, pointer or focus). Screen readers hear
// "Viewer feels: Curiosity"; the screen shows the word only.
function EmotionTag({ emotion }: { emotion: HookEmotion }) {
  return (
    <span className={`hook-emo emo-${emotion}`}>
      <span className="sr-only">{t('plan.hooks.emotionLead')}</span>
      {t(emotionKey(emotion))}
    </span>
  )
}

// The first section of the plan screen: suggested hooks for the client's version. Picking one sets shot 1's line.
export function PlanHooks({ ideaId, saved, video, format, client, shots, editable, onShots }: Props) {
  const ideas = suggestedHooks(shots, format, video, client)
  const current = shots[0]?.line?.trim() ?? ''
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  // "+ Add a hook": the user's own first line, typed into the fourth card.
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const sameText = (a: string, b: string) => a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ')
  // A picked line that isn't one of the suggestions is the user's own: it gets a card of its own.
  const own = current && !ideas.some((h) => sameText(h.text, current)) ? current : ''
  const addOwn = () => {
    if (!draft.trim()) return
    pick(draft)
    setDraft('')
    setAdding(false)
  }

  // Always the newest shots, so an answer that arrives late merges into what is on screen now.
  const latest = useRef(shots)
  useEffect(() => {
    latest.current = shots
  }, [shots])

  const pick = (text: string) => {
    setNotice('')
    onShots(pickHook(latest.current, text))
  }

  // Live only: ask the script writer for new openings for shot 1. The answer becomes shot 1's options; the line
  // the user picked stays.
  const writeMore = async () => {
    setBusy(true)
    setNotice('')
    setProblem('')
    try {
      if (!saved) {
        onShots(latest.current)
        await sleep(SAVE_SETTLE_MS)
      }
      const res = await writeShotScript(ideaId, 0, true)
      const next = withHookOptions(latest.current, res)
      latest.current = next
      onShots(next)
      setNotice(res.source === 'demo' ? t('plan.hooks.sampleWritten') : t('plan.hooks.written'))
    } catch {
      setProblem(t('plan.hooks.err'))
    } finally {
      setBusy(false)
    }
  }

  // Hook cards (drawer-plan.css "Studio layout"): a title, then one card per way to start.
  return (
    <section className="plan-sec hook-ideas" aria-labelledby="hook-ideas-title">
      <header className="plan-sec-head">
        <h2 id="hook-ideas-title">{t('plan.hooks.ideasTitle', { client: client.name })}</h2>
      </header>
      {editable || ideas.length > 0 ? (
        <>
          <ul className="hook-list">
            {ideas.map((h, i) => {
              const picked = !!current && current === h.text
              return (
                <li key={h.text} className={`hook-option${picked ? ' is-picked' : ''}`}>
                  <div className="hook-head">
                    <span className="hook-option-no" aria-hidden="true">
                      {t('plan.hooks.no', { n: i + 1 })}
                    </span>
                    <EmotionTag emotion={hookEmotion(h)} />
                  </div>
                  <span className="hook-option-text">{h.text}</span>
                  {/* Waiting or approved: the same cards, locked. The picked one is outlined and says so; no buttons. */}
                  {!editable ? (
                    picked && <span className="btn btn-sm btn-primary hook-picked-tag">{t('plan.hooks.picked')}</span>
                  ) : (
                  <button
                    type="button"
                    className={`btn btn-sm ${picked ? 'btn-primary' : 'btn-ghost'}`}
                    aria-pressed={picked}
                    aria-label={t('plan.hooks.useAria', { text: h.text })}
                    onClick={() => pick(h.text)}
                  >
                    {picked ? t('plan.hooks.picked') : t('plan.hooks.use')}
                  </button>
                  )}
                </li>
              )
            })}
            {own && (
              <li className="hook-option is-picked">
                <div className="hook-head">
                  <span className="hook-option-no" aria-hidden="true">
                    {t('plan.hooks.no', { n: ideas.length + 1 })}
                  </span>
                  <span className="hook-emo hook-own-tag">{t('plan.hooks.ownTag')}</span>
                </div>
                <span className="hook-option-text">{own}</span>
                <span className="btn btn-sm btn-primary hook-picked-tag">{t('plan.hooks.picked')}</span>
              </li>
            )}
            {editable &&
              (adding ? (
                <li className="hook-option hook-add-form">
                  <span className="hook-option-no">{t('plan.hooks.no', { n: ideas.length + (own ? 2 : 1) })}</span>
                  <textarea
                    className="hook-add-text"
                    rows={3}
                    autoFocus
                    aria-label={t('plan.hooks.addLabel')}
                    placeholder={t('plan.hooks.addPlaceholder')}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addOwn()
                      }
                      if (e.key === 'Escape') setAdding(false)
                    }}
                  />
                  <div className="hook-add-actions">
                    <button type="button" className="btn btn-primary btn-sm" disabled={!draft.trim()} onClick={addOwn}>
                      {t('plan.hooks.use')}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>
                      {t('plan.common.cancel')}
                    </button>
                  </div>
                </li>
              ) : (
                <li className="hook-add-slot" role="none">
                  <button type="button" className="shot-frame-add hook-add" onClick={() => setAdding(true)}>
                    {t('plan.hooks.add')}
                  </button>
                </li>
              ))}
          </ul>
          {editable && video.live && shots.length > 0 && (
            <div className="hook-actions">
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void writeMore()}>
                {busy ? t('plan.hooks.writing') : t('plan.hooks.writeMore')}
              </button>
              {notice && (
                <span className="small muted" role="status">
                  {notice}
                </span>
              )}
            </div>
          )}
          {problem && (
            <p className="sb-error" role="alert">
              {problem}
            </p>
          )}
        </>
      ) : (
        <p className="hook-yours">
          {current && (
            <EmotionTag emotion={hookEmotion(ideas.find((h) => h.text === current) ?? { text: current })} />
          )}
          <span>{current ? t('plan.hooks.yours', { text: current }) : t('plan.hooks.none')}</span>
        </p>
      )}
    </section>
  )
}
