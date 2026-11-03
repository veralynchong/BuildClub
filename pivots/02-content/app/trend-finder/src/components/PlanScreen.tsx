import { useCallback, useEffect, useRef, useState } from 'react'
import type { Client, Format, IdeaStatus, SavedIdea, Shot, Video } from '../types'
import { useApp, useManagerName } from '../lib/appContext'
import { compact, hasScore, scoreBase, outlierScore, platformName, tierOf, viewsWord } from '../lib/metrics'
import { dueLabel, formatDay } from '../lib/dates'
import type { Decision } from '../lib/memory'
import { BestVideo } from './BestVideo'
import type { PlayerControl } from './BestVideo'
import { beatUsual } from './find/words'
import { TimedComments } from './TimedComments'
import { tiktokVideoId } from '../lib/tiktokPlayer.ts'
import { FromScript } from './FromScript'
import { PlanHooks } from './PlanHooks'
import { cameraLabels, looksLikeInterview } from '../lib/shots'
import { lastSentBack } from '../lib/memory'
import { ShotChecklist } from './ShotChecklist'
import { CutPanel } from './CutPanel'
import { PublishPanel } from './publish/PublishPanel'
import { newShotId } from '../lib/storyboard'
import { t } from '../lib/i18n'
import { approverNote } from '../lib/approverNote'

interface Props {
  idea: SavedIdea
  video: Video
  format: Format
  client: Client
  onChange: (patch: Partial<SavedIdea>) => void
  onBack: () => void
  // Where Back goes ("search results", "approvals"…), so it returns to the screen she came from.
  backLabel: string
  onFindMore: () => void
  onGoApprovals: () => void
  onPlanAnother: () => void
  // The signed-in user is the only approver, so a waiting plan is approved or sent back right here (App's decide).
  onDecide: (d: Decision) => void
  onOpenCanvas: (editor?: boolean) => void // `editor`: open it with the editor already showing
  // Opens the node-based planning board for this plan. The button shows only when it is given.
  onOpenBoard?: () => void
}

const statusLabel = (s: IdeaStatus): string => t(`plan.screen.status.${s}`)

const ago = (ts?: number) => {
  if (!ts) return ''
  const mins = Math.round((Date.now() - ts) / 60_000)
  return mins < 1 ? t('plan.ago.now') : mins < 60 ? t('plan.ago.min', { n: mins }) : t('plan.ago.hour', { n: Math.round(mins / 60) })
}

export function PlanScreen(p: Props) {
  const { idea, video, format, client, onChange, onBack, onFindMore, onGoApprovals, onPlanAnother, onDecide, onOpenCanvas } = p
  // The person who approves plans, from the agency settings. Only a signed-in manager decides here;
  // a team member's plan is decided by the manager (in the app or on the review link).
  const APPROVER = useManagerName()
  const canDecide = useApp().role === 'manager'
  // Last removed shot, so an accidental ✕ can be undone.
  const [removed, setRemoved] = useState<{ shot: Shot; index: number } | null>(null)
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle')
  // Index of a shot just added with "+ Add a shot", so only that row plays its enter animation.
  const [addedAt, setAddedAt] = useState<number | null>(null)
  // "Edit" on an approved plan asks first, because it sends the plan back for approval.
  const [confirmEdit, setConfirmEdit] = useState(false)
  // Counts every report from the checklist (a take added, removed or re-chosen), for the video panel's stale check.
  const [takesRevision, setTakesRevision] = useState(0)
  useEffect(() => {
    setTakesRevision(0)
  }, [idea.id])
  const onTakesProgress = useCallback(() => {
    setTakesRevision((r) => r + 1)
  }, [])
  // Deciding on a waiting plan: approve with changes or send back both need a comment.
  const [deciding, setDeciding] = useState<'changes' | 'back' | null>(null)
  const [decisionText, setDecisionText] = useState('')
  const startDeciding = (m: 'changes' | 'back') => {
    setDeciding(m)
    setDecisionText('')
  }
  const confirmDecision = () => {
    const text = decisionText.trim()
    if (!text || !deciding) return
    onDecide({ kind: deciding === 'changes' ? 'approved-with-changes' : 'sent-back', comment: text })
    setDeciding(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const approveNow = () => {
    onDecide({ kind: 'approved' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const shots = idea.shots ?? format.shotList
  // Approved plans are locked: the team films what the manager approved. Sent-back plans can be fixed and sent again.
  // An approved plan reopened with "Edit" waits with approvedAt still set, and stays editable while it waits.
  const reopened = idea.status === 'waiting' && !!idea.approvedAt
  const editable = idea.status === 'saved' || idea.status === 'rejected' || reopened
  const comments = idea.shotComments ?? {}
  const playerControl = useRef<PlayerControl | null>(null)
  const shotComment = (i: number) =>
    comments[i] && (
      <span className="shot-comment">
        {t('plan.screen.comment', { text: comments[i] })}
      </span>
    )
  const score = outlierScore(video)
  const tier = tierOf(score)

  const send = () => {
    onChange({ status: 'waiting', sentAt: Date.now(), noteToApprover: idea.noteToApprover ?? approverNote(client, format, 'en'), rejectReason: undefined, rejectTags: undefined })
    // Bring the confirmation into view.
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const reopen = () => {
    setConfirmEdit(false)
    onChange({ status: 'waiting', sentAt: Date.now(), approvedAt: idea.approvedAt ?? Date.now(), stage: undefined, postedAt: undefined })
  }
  const sendButton = (
    <button className="btn btn-primary" disabled={shots.length === 0} onClick={send}>
      {t('plan.common.sendForApproval')}
    </button>
  )
  // Everything the editor needs in one paste: reference, shots, props and notes.
  const brief = [
    t('plan.brief.title', { format: format.name, client: client.name }),
    t('plan.brief.due', { date: formatDay(idea.dueDate) }),
    t('plan.brief.video', { video: video.url ?? `${video.handle}, "${video.hook}"` }),
    '',
    t('plan.brief.shots'),
    ...shots.map((s, i) => `${i + 1}. ${s.time ? `[${s.time}] ` : ''}${s.shot}${s.text ? ` ${t('plan.brief.textOnScreen', { text: s.text })}` : ''}${cameraLabels(s).length ? ` (${cameraLabels(s).join(', ')})` : ''}${s.tip ? ` - ${s.tip}` : ''}`),
    ...(format.props.length ? ['', t('plan.brief.props', { props: format.props.join(', ') })] : []),
    ...(idea.notes ? ['', t('plan.brief.notes', { notes: idea.notes })] : []),
  ].join('\n')
  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(brief)
      setCopied('done')
    } catch {
      setCopied('failed')
    }
  }

  const setShots = (next: Shot[]) => onChange({ shots: next })
  const updateShot = (i: number, patch: Partial<Shot>) => setShots(shots.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  return (
    <section className="plan">
      <button className="link-btn" onClick={onBack}>
        {t('plan.screen.back', { label: p.backLabel })}
      </button>

      <header className="plan-head">
        <div className="plan-head-row">
          <span className="eyebrow">{t('plan.screen.eyebrow', { client: client.name })}</span>
          <span className="small muted">{statusLabel(idea.status)}</span>
        </div>
        <h1>{format.name}</h1>
      </header>

      {idea.status === 'waiting' && (
        <div className="sent-banner" role="status">
          <span className="sent-check" aria-hidden="true">
            ✓
          </span>
          <div>
            {canDecide ? (
              <>
                <strong>{reopened ? t('plan.screen.banner.reopenedManager') : t('plan.screen.banner.waiting')}</strong>
                <span>
                  {reopened
                    ? t('plan.screen.banner.reopenedManagerBody', { ago: ago(idea.sentAt) })
                    : t('plan.screen.banner.waitingManagerBody', { ago: ago(idea.sentAt) })}
                </span>
              </>
            ) : (
              <>
                <strong>{reopened ? t('plan.screen.banner.reopenedTeam', { approver: APPROVER }) : t('plan.screen.banner.sentTeam', { approver: APPROVER })}</strong>
                <span>
                  {reopened
                    ? t('plan.screen.banner.reopenedTeamBody', { ago: ago(idea.sentAt), approver: APPROVER })
                    : t('plan.screen.banner.sentTeamBody', { ago: ago(idea.sentAt), approver: APPROVER, client: client.name })}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {idea.status === 'approved' && (
        <div className="sent-banner" role="status">
          <span className="sent-check" aria-hidden="true">
            ✓
          </span>
          <div>
            <strong>{idea.managerNote ? t('plan.screen.banner.approvedWithChanges', { approver: APPROVER }) : t('plan.screen.banner.approved', { approver: APPROVER })}</strong>
            <span>{t('plan.screen.banner.approvedBody', { date: formatDay(idea.dueDate) })}</span>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onOpenCanvas(true)}>
            {t('canvas.makeVideo')}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenCanvas()}>
            {t('canvas.open')}
          </button>
        </div>
      )}

      <div className="plan-grid">
        <aside className="plan-ref">
          <BestVideo key={video.id} video={video} control={playerControl} />
          {hasScore(video) ? (
            <>
              <div className="plan-ref-score">
                <span className="cmp-from">{compact(scoreBase(video))}</span>
                <span className="cmp-arrow" aria-hidden="true">
                  →
                </span>
                <span className={`cmp-to score-${tier}`}>{compact(video.views)}</span>
              </div>
              <span className="small">{beatUsual(video)}</span>
            </>
          ) : (
            <div className="plan-ref-score">
              <span className="cmp-to">{compact(video.views)}</span> <span className="small muted">{viewsWord(video)}</span>
            </div>
          )}
          <span className="small muted">
            {t('plan.screen.videoToCopy', { handle: video.handle })}
            {video.url && (
              <>
                {' · '}
                <a className="plan-watch" href={video.url} target="_blank" rel="noreferrer">
                  {t('plan.screen.watchOn', { platform: platformName[video.platform] })}
                </a>
              </>
            )}
          </span>
          <TimedComments
            key={idea.id}
            ideaId={idea.id}
            videoId={idea.videoId}
            control={playerControl}
            canSeek={!!video.live && video.platform === 'tiktok' && !!tiktokVideoId(video.url)}
          />
        </aside>

        <div className="plan-main">
          {/* Two sections only: suggested hooks, then the shot list (which opens the planning board). */}
          <PlanHooks
            key={`hooks-${idea.id}`}
            ideaId={idea.id}
            saved={!!idea.shots}
            video={video}
            format={format}
            client={client}
            shots={shots}
            editable={editable}
            onShots={setShots}
          />

          <section className="block plan-sec" aria-labelledby="plan-shots-title">
            <header className="plan-sec-head">
              <h2 id="plan-shots-title">{t('plan.screen.shots')}</h2>
              {/* Only a note when the list is locked or needs approving again; an editable list explains itself. */}
              {(reopened || !editable) && (
                <p>
                  {reopened
                    ? t('plan.screen.shotsHint.reopened')
                    : idea.status === 'approved'
                      ? t('plan.screen.shotsHint.approved')
                      : t('plan.screen.shotsHint.locked')}
                </p>
              )}
            </header>
            {shots.length === 0 && !editable && <p className="muted small">{t('plan.screen.noShots')}</p>}
            {shots.length === 0 && editable && format.shotList.length === 0 && !format.why.first3s.startsWith('Breaking down') && (
              <p className="small muted" role="status">
                {t('plan.screen.noBreakdown')}
              </p>
            )}
            {editable && (
              <FromScript
                key={`script-${idea.id}`}
                shots={shots}
                interviewGuess={looksLikeInterview(format.name, format.why.concept, format.why.format)}
                onShots={(next) => {
                  setRemoved(null)
                  setAddedAt(null)
                  setShots(next)
                }}
              />
            )}
            <ol className="shot-edit">
              {shots.map((s, i) => (
                <li key={i} className={i === addedAt ? 'shot-added' : undefined}>
                  {editable ? (
                    <>
                      {/* Just "Shot n" and what it is. Timing and camera are set on the planning board. */}
                      <span className="shot-no">{t('plan.screen.shotNo', { n: i + 1 })}</span>
                      <div className="shot-fields">
                        <input
                          id={`shot-desc-${i}`}
                          aria-label={t('plan.screen.shotWhat', { n: i + 1 })}
                          value={s.shot}
                          placeholder={t('plan.screen.whatWeFilm')}
                          onChange={(e) => updateShot(i, { shot: e.target.value })}
                        />
                        {shotComment(i)}
                      </div>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={t('plan.screen.removeShot', { n: i + 1 })}
                        onClick={() => {
                          setRemoved({ shot: s, index: i })
                          setAddedAt(null)
                          setShots(shots.filter((_, j) => j !== i))
                        }}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="shot-no">{t('plan.screen.shotNo', { n: i + 1 })}</span>
                      <span>
                        {s.shot}
                        {shotComment(i)}
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ol>
            {editable && (
              <div className="shot-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setAddedAt(shots.length)
                    setShots([...shots, { id: newShotId(), time: '', shot: '' }])
                  }}
                >
                  {t('plan.screen.addShot')}
                </button>
                {removed && (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      const next = [...shots]
                      next.splice(Math.min(removed.index, next.length), 0, removed.shot)
                      setShots(next)
                      setRemoved(null)
                    }}
                  >
                    {t('plan.screen.undoRemove')}
                  </button>
                )}
              </div>
            )}
            {p.onOpenBoard && (
              <div className="plan-board-link">
                <button type="button" className="btn btn-primary" onClick={p.onOpenBoard}>
                  {t('plan.hooks.openBoard')}
                </button>
              </div>
            )}
          </section>

          {/* Production: once the plan is approved, footage takes, the video (made on the canvas) and publishing. */}
          {idea.status === 'approved' && (
            <>
              <ShotChecklist key={idea.id} ideaId={idea.id} status={idea.status} shots={shots} onProgress={onTakesProgress} />
              <CutPanel key={`cut-${idea.id}`} ideaId={idea.id} status={idea.status} shotCount={shots.length} takesRevision={takesRevision} onOpenCanvas={onOpenCanvas} />
              <PublishPanel key={`pub-${idea.id}`} ideaId={idea.id} status={idea.status} shotCount={shots.length} />
            </>
          )}

          {idea.status === 'rejected' && (
            <section className="block">
              <h3>{t('plan.screen.feedbackOf', { approver: APPROVER })}</h3>
              {idea.rejectTags && idea.rejectTags.length > 0 && <p className="small">{idea.rejectTags.join(' · ')}</p>}
              <p className="quote">{idea.rejectReason || (idea.rejectTags?.length ? t('plan.screen.noWrittenReason') : t('plan.screen.noReason'))}</p>
            </section>
          )}
          {idea.status !== 'rejected' && lastSentBack(idea) && (
            <section className="block">
              <h3>{t('plan.screen.lastSentBack', { approver: APPROVER })}</h3>
              {(lastSentBack(idea)?.tags?.length ?? 0) > 0 && <p className="small">{lastSentBack(idea)?.tags?.join(' · ')}</p>}
              <p className="quote">{lastSentBack(idea)?.reason || t('plan.screen.noWrittenReason')}</p>
            </section>
          )}

        </div>
      </div>

      {/* The next step for this idea, always visible at the bottom of the screen. */}
      <div className="plan-bar">
        {idea.status === 'saved' && (
          <>
            <span className="plan-bar-text">{t('plan.screen.bar.saved')}</span>
            <button className="btn btn-ghost" onClick={onBack}>
              {t('plan.screen.bar.saveLater')}
            </button>
            {sendButton}
          </>
        )}

        {idea.status === 'waiting' && canDecide && deciding && (
          <>
            {/* Full width so the question stays visible on phones too (the bar hides button-less text there). */}
            <label className="field" style={{ flexBasis: '100%' }}>
              <span className="field-label">
                {deciding === 'changes' ? t('plan.screen.bar.changesQ') : t('plan.screen.bar.backQ')}
              </span>
              <textarea
                id="plan-decision"
                rows={2}
                value={decisionText}
                onChange={(e) => setDecisionText(e.target.value)}
                autoFocus
              />
            </label>
            <button className="btn btn-ghost" onClick={() => setDeciding(null)}>
              {t('plan.common.cancel')}
            </button>
            <button className="btn btn-primary" onClick={confirmDecision} disabled={!decisionText.trim()}>
              {deciding === 'changes' ? t('plan.common.approveWithChanges') : t('plan.common.sendBack')}
            </button>
          </>
        )}

        {idea.status === 'waiting' && !canDecide && (
          <>
            <span className="plan-bar-text">
              {t('plan.screen.bar.waitingFor', { approver: APPROVER })}{' '}
              <button className="link-btn" onClick={() => onChange({ status: 'saved' })}>
                {t('plan.common.takeItBack')}
              </button>
              {' · '}
              <button className="link-btn" onClick={onGoApprovals}>
                {t('plan.common.openPlans')}
              </button>
            </span>
            <button className="btn btn-primary" onClick={onPlanAnother}>
              {t('plan.common.planAnother')}
            </button>
          </>
        )}

        {idea.status === 'waiting' && canDecide && !deciding && (
          <>
            <span className="plan-bar-text">
              {t('plan.screen.bar.waiting')}{' '}
              <button className="link-btn" onClick={() => onChange({ status: 'saved' })}>
                {t('plan.common.takeItBack')}
              </button>
              {' · '}
              <button className="link-btn" onClick={onGoApprovals}>
                {t('plan.common.openPlans')}
              </button>
            </span>
            <button className="btn btn-ghost" onClick={() => startDeciding('back')}>
              {t('plan.common.sendBack')}
            </button>
            <button className="btn btn-ghost" onClick={() => startDeciding('changes')}>
              {t('plan.common.approveWithChanges')}
            </button>
            <button className="btn btn-primary" onClick={approveNow}>
              {t('plan.screen.bar.approve')}
            </button>
          </>
        )}

        {idea.status === 'approved' && confirmEdit && (
          <>
            <span className="plan-bar-text">{t('plan.screen.bar.reopenQ')}</span>
            <button className="btn btn-ghost" onClick={() => setConfirmEdit(false)}>
              {t('plan.common.cancel')}
            </button>
            <button className="btn btn-primary" onClick={reopen}>
              {t('plan.common.continue')}
            </button>
          </>
        )}

        {idea.status === 'approved' && !confirmEdit && (
          <>
            <span className="plan-bar-text" role="status">
              {copied === 'done'
                ? t('plan.screen.bar.briefCopied')
                : copied === 'failed'
                  ? t('plan.screen.bar.copyFailed')
                  : t('plan.screen.bar.approvedDue', { due: dueLabel(idea.dueDate).text })}
            </span>
            <button className="btn btn-ghost" onClick={() => setConfirmEdit(true)}>
              {t('plan.screen.bar.edit')}
            </button>
            <button className="btn btn-ghost" onClick={onPlanAnother}>
              {t('plan.common.planAnother')}
            </button>
            <button
              className={`btn btn-primary copy-btn${copied === 'done' ? ' is-copied' : ''}`}
              onClick={() => void copyBrief()}
            >
              {copied === 'done' ? (
                <>
                  {t('plan.common.copied')}
                  <svg className="copy-icon copy-icon-check" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                </>
              ) : (
                <>
                  <svg className="copy-icon" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M5.5 5.5V3.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2" />
                    <path d="M3.5 5.5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1z" />
                  </svg>
                  {t('plan.screen.bar.copyBrief')}
                </>
              )}
            </button>
          </>
        )}

        {idea.status === 'rejected' && (
          <>
            <span className="plan-bar-text">{t('plan.screen.bar.rejected')}</span>
            <button className="btn btn-ghost" onClick={onFindMore}>
              {t('plan.screen.bar.findAnother')}
            </button>
            {sendButton}
          </>
        )}
      </div>
    </section>
  )
}
