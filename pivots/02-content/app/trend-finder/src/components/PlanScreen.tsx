import { useCallback, useEffect, useRef, useState } from 'react'
import type { Client, Format, SavedIdea, Shot, Video } from '../types'
import { useApp, useManagerName } from '../lib/appContext'
import { byFollowers, compact, scoreBase, platformName } from '../lib/metrics'
import { dueLabel } from '../lib/dates'
import type { Decision } from '../lib/memory'
import { BestVideo } from './BestVideo'
import type { PlayerControl } from './BestVideo'
import { FromScript } from './FromScript'
import { PlanHooks } from './PlanHooks'
import { looksLikeInterview } from '../lib/shots'
import { lastSentBack } from '../lib/memory'
import { ShotChecklist } from './ShotChecklist'
import { CutPanel } from './CutPanel'
import { PublishPanel } from './publish/PublishPanel'
import { newShotId } from '../lib/storyboard'
import { t } from '../lib/i18n'

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

export function PlanScreen(p: Props) {
  const { idea, video, format, client, onChange, onBack, onFindMore, onGoApprovals, onDecide, onOpenCanvas } = p
  // The person who approves plans, from the agency settings. Only a signed-in manager decides here;
  // a team member's plan is decided by the manager (in the app or on the review link).
  const APPROVER = useManagerName()
  const canDecide = useApp().role === 'manager'
  // Last removed shot, so an accidental ✕ can be undone.
  const [removed, setRemoved] = useState<{ shot: Shot; index: number } | null>(null)
  // Counts every report from the checklist (a take added, removed or re-chosen), for the video panel's stale check.
  const [takesRevision, setTakesRevision] = useState(0)
  useEffect(() => {
    setTakesRevision(0)
  }, [idea.id])
  const onTakesProgress = useCallback(() => {
    setTakesRevision((r) => r + 1)
  }, [])
  // Index of a shot just added with "+ Add a shot", so only that row plays its enter animation.
  const [addedAt, setAddedAt] = useState<number | null>(null)
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

  // "Plan video" opens the planning board; sending for approval happens there.
  const sendButton = p.onOpenBoard ? (
    <button className="btn btn-primary" disabled={shots.length === 0} onClick={p.onOpenBoard}>
      {t('plan.common.planVideo')}
    </button>
  ) : null

  const setShots = (next: Shot[]) => onChange({ shots: next })
  const updateShot = (i: number, patch: Partial<Shot>) => setShots(shots.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  return (
    <section className="plan">
      <div className="plan-studio">
        {/* Left: the video on a navy stage, big enough to watch while planning. Sticky on wide screens. */}
        <aside className="plan-stage" aria-label={t('plan.screen.tab.video')}>
          <div className="plan-stage-top">
            <button className="link-btn" onClick={onBack}>
              {t('plan.screen.back', { label: p.backLabel })}
            </button>
            {/* The stage's header: the video's title, its account, then followers → views */}
            <div className="plan-stage-head">
              <h2 className="plan-stage-title">{video.hook}</h2>
              <span className="plan-stage-handle">{video.handle}</span>
              <span className="best-compare tile-cmp plan-stage-cmp">
                <span className="cmp-num cmp-from">{scoreBase(video) > 0 ? compact(scoreBase(video)) : '–'}</span>
                <span className="cmp-arrow" aria-hidden="true">→</span>
                <span className="cmp-num cmp-to">{compact(video.views)}</span>
                <span className="cmp-cap">{byFollowers(video) ? t('find.res.cmpFollowers') : t('find.res.cmpUsual')}</span>
                <span />
                <span className="cmp-cap">{t('find.tile.cmpViews')}</span>
              </span>
            </div>
          </div>
          <div className="plan-stage-video">
            <BestVideo key={video.id} video={video} control={playerControl} />
          </div>
          {/* Under the video: the link to watch the original */}
          <div className="tile-body plan-ref-info">
            {video.url && (
              <a className="tile-link link-btn" href={video.url} target="_blank" rel="noreferrer">
                {t('find.watchOn', { platform: platformName[video.platform] })} ↗
              </a>
            )}
          </div>
        </aside>

        {/* Right: the work. Suggested hooks and the shot list, the same layout whatever the plan's status. */}
        <div className="plan-panel">

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

          <section className="plan-sec" aria-labelledby="plan-shots-title">
            <header className="plan-sec-head">
              <h2 id="plan-shots-title">{t('plan.screen.shots')}</h2>
            </header>
            {shots.length === 0 && !editable && <p className="muted small">{t('plan.screen.noShots')}</p>}
            {shots.length === 0 && editable && format.shotList.length === 0 && !format.why.first3s.startsWith('Breaking down') && (
              <p className="small muted" role="status">
                {t('plan.screen.noBreakdown')}
              </p>
            )}
            {/* Shots as numbered storyboard frames; they wrap into rows. "+ Add a shot" is the last tile. */}
            <ol className="shot-frames">
              {shots.map((s, i) => (
                <li key={i} className={`shot-frame${i === addedAt ? ' shot-added' : ''}`}>
                  <span className="shot-no">{t('plan.screen.shotNo', { n: i + 1 })}</span>
                  {editable ? (
                    <>
                      {/* Just "Shot n" and what it is. Timing and camera are set on the planning board. */}
                      <textarea
                        id={`shot-desc-${i}`}
                        className="shot-frame-text"
                        rows={2}
                        aria-label={t('plan.screen.shotWhat', { n: i + 1 })}
                        value={s.shot}
                        placeholder={t('plan.screen.whatWeFilm')}
                        onChange={(e) => updateShot(i, { shot: e.target.value })}
                        // One line per shot, like the old single-line field: Enter doesn't add a line break.
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.preventDefault()
                        }}
                      />
                      {shotComment(i)}
                      <button
                        type="button"
                        className="icon-btn shot-frame-x"
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
                    <span className="shot-frame-read">
                      {s.shot}
                      {shotComment(i)}
                    </span>
                  )}
                </li>
              ))}
              {editable && (
                <li className="shot-frame-add-slot" role="none">
                  <button
                    type="button"
                    className="shot-frame-add"
                    onClick={() => {
                      setAddedAt(shots.length)
                      setShots([...shots, { id: newShotId(), time: '', shot: '' }])
                    }}
                  >
                    {t('plan.screen.addShot')}
                  </button>
                </li>
              )}
            </ol>
            {editable && (
              <div className="plan-tools">
                {editable && removed && (
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
            </span>
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

        {idea.status === 'approved' && (
          <>
            <span className="plan-bar-text" role="status">
              {t('plan.screen.bar.approvedDue', { due: dueLabel(idea.dueDate).text })}
            </span>
            <button type="button" className="btn btn-primary" onClick={() => onOpenCanvas()}>
              {t('canvas.open')}
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
