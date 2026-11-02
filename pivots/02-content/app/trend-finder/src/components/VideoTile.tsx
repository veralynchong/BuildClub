import { useState } from 'react'
import type { IdeaStatus, Video } from '../types'
import { byFollowers, compact, hasDate } from '../lib/metrics'
import { beatUsual, contentTypeLabel, daysAgoWords, viewsLabel } from './find/words'
import { t } from '../lib/i18n'
import { Thumb } from './Thumb'
import { useManagerName } from '../lib/appContext'
import { EvidenceChip } from './EvidenceChip'
import { NumbersSource } from './NumbersSource'
import { COPY, EVIDENCE_TEXT, BASELINE_PLATFORMS, cachedLabel, evidenceOf, plainLine, type Cohort } from '../lib/evidence'

interface Props {
  video: Video
  onOpen: () => void
  // Saves the video to the client's Research, or takes it off again.
  onToggleSave: () => void
  // Where this video's plan stands for the current client, if it has one.
  status?: IdeaStatus
  // In the client's Research sheet.
  inResearch?: boolean
  // The accounts using the same pattern in this search, if any.
  cohort?: Cohort
  // Which of the client's videos it's filed under in Research ("Video 2" / "Video 2 · Easy tofu dessert").
  where?: { short: string; full: string } | null
  // Opens Research on that video with this row in view.
  onOpenInResearch?: () => void
  // A followers filter is on and this video's followers aren't known yet, so it was kept rather than dropped.
  followersLoading?: boolean
}

// Where the plan stands, as a plain line under the video (no coloured badge on the cover).
const statusLine = (manager: string): Record<IdeaStatus, string> => ({
  saved: t('find.tile.saved'),
  waiting: t('find.tile.waiting', { manager }),
  approved: t('find.tile.approved', { manager }),
  rejected: t('find.tile.rejected', { manager }),
})

// One video in the results grid: cover, views, one sentence comparing them with usual, what it says and who posted it.
export function VideoTile({ video, onOpen, onToggleSave, status, inResearch, cohort, followersLoading, where, onOpenInResearch }: Props) {
  const manager = useManagerName()
  const compare = beatUsual(video)
  // The button pops only when it's clicked, not when a tile shows up already saved.
  const [pop, setPop] = useState(false)
  const saved = !status && Boolean(inResearch)
  const evidence = video.live ? evidenceOf(video, cohort) : null
  const spoken = !video.live
    ? ''
    : evidence
      ? `${EVIDENCE_TEXT[evidence]}. ${plainLine(video, cohort)}`
      : BASELINE_PLATFORMS.includes(video.platform)
        ? ''
        : COPY.noPlatform
  return (
    <article className="tile">
      <button className="tile-main" data-video-id={video.id} onClick={onOpen} aria-label={t('find.seeWhyAria', { hook: video.hook }) + `. ${compare}${spoken ? `. ${spoken}` : ''}`}>
        <Thumb video={video} preview />
        <div className="tile-body">
          <span className="tile-views">
            <span className="tile-compare">{compact(video.views)}</span> {viewsLabel(video)}
          </span>
          {(byFollowers(video) || followersLoading) && (
            <span className="tile-facts">
              {byFollowers(video)
                ? t('find.filter.tileLine', { followers: video.followers.toLocaleString('en-US'), views: compact(video.views) })
                : t('find.filter.followersLoading')}
            </span>
          )}
          <span className="tile-cap">{compare}</span>
          <EvidenceChip video={video} cohort={cohort} compact />
          {video.contentType && <span className="tile-type">{contentTypeLabel(video.contentType)}</span>}
          <span className="tile-hook">{video.hook}</span>
          <span className="tile-meta">
            {video.handle}
            {hasDate(video) && ` · ${daysAgoWords(video.daysAgo)}`}
            {video.comments !== undefined && ` · ${t('find.tile.comments', { count: compact(video.comments) })}`}
            {video.live && video.fromCache && ` · ${cachedLabel(video.fetchedAt ?? 0, Date.now())}`}
          </span>
          {status && <span className="tile-plan">{statusLine(manager)[status]}</span>}
        </div>
      </button>
      <NumbersSource video={video} />
      {/* Once it has a plan, the line above shows where it stands and the Save button goes away. */}
      {!status && (
        <button
          className={`tile-save ${saved ? 'tile-save-on' : ''} ${pop ? 'tile-save-pop' : ''}`}
          aria-pressed={saved}
          aria-label={saved ? t('find.tile.unsaveAria') : t('find.tile.saveIdea')}
          title={saved ? t('find.tile.savedTitle') : t('find.tile.saveIdea')}
          onClick={() => {
            setPop(true)
            onToggleSave()
          }}
          onAnimationEnd={() => setPop(false)}
        >
          {saved ? (where ? `✓ ${where.short}` : t('find.tile.savedShort')) : t('find.tile.plusSave')}
        </button>
      )}
      {/* Saved (or planned): which video it's filed under, and a way straight to it in Research. */}
      {where && inResearch && (
        <p className="tile-where small">
          <span>
            {t('find.res.savedTo')}
            <strong>{where.full}</strong>
          </span>
          {onOpenInResearch && (
            <button type="button" className="link-btn" onClick={onOpenInResearch}>
              {t('find.res.openInResearch')}
            </button>
          )}
        </p>
      )}
    </article>
  )
}
