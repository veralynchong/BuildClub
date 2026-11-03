import { useState } from 'react'
import type { Video } from '../types'
import { byFollowers, compact, platformName, scoreBase } from '../lib/metrics'
import { t } from '../lib/i18n'
import { Thumb } from './Thumb'

interface Props {
  video: Video
  onOpen: () => void
  // Saves the video to the client's Research, or takes it off again.
  onToggleSave: () => void
  // In the client's Research sheet.
  inResearch?: boolean
  // Which of the client's videos it's filed under in Research ("Video 2" / "Video 2 · Easy tofu dessert").
  where?: { short: string; full: string } | null
  // A followers filter is on and this video's followers aren't known yet, so it was kept rather than dropped.
  followersLoading?: boolean
}

// One video in the results grid. Under the cover, only four things: followers → views (laid out like the
// Best to copy card), the title, the account, and a link to the video itself.
export function VideoTile({ video, onOpen, onToggleSave, inResearch, followersLoading, where }: Props) {
  // The button pops only when it's clicked, not when a tile shows up already saved.
  const [pop, setPop] = useState(false)
  const saved = Boolean(inResearch)
  const followers = byFollowers(video)
  // No followers (Reddit, some live Instagram results): fall back to the account's usual views, as Best to copy does.
  const base = followers ? video.followers : scoreBase(video)
  const fromNum = followersLoading && !followers ? '…' : base > 0 ? compact(base) : '–'
  const fromCap = followers || followersLoading ? t('find.res.cmpFollowers') : t('find.res.cmpUsual')
  return (
    <article className="tile">
      <button className="tile-main" data-video-id={video.id} onClick={onOpen} aria-label={t('find.tile.openAria', { hook: video.hook, handle: video.handle })}>
        <Thumb video={video} preview />
        <div className="tile-body">
          <span className="best-compare tile-cmp">
            <span className="cmp-num cmp-from">{fromNum}</span>
            <span className="cmp-arrow" aria-hidden="true">→</span>
            <span className="cmp-num cmp-to">{compact(video.views)}</span>
            <span className="cmp-cap">{fromCap}</span>
            <span />
            <span className="cmp-cap">{t('find.tile.cmpViews')}</span>
          </span>
          <span className="tile-hook">{video.hook}</span>
          <span className="tile-meta">{video.handle}</span>
        </div>
      </button>
      {video.url && (
        <a className="tile-link link-btn" href={video.url} target="_blank" rel="noreferrer">
          {t('find.watchOn', { platform: platformName[video.platform] })} ↗
        </a>
      )}
      {/* Every video gets the Save pill, planned or not. */}
        <button
          className={`tile-save ${saved ? 'tile-save-on' : ''} ${pop ? 'tile-save-pop' : ''}`}
          aria-pressed={saved}
          aria-label={saved ? t('find.tile.unsaveAria') : t('find.tile.saveIdea')}
          title={saved ? (where?.full ?? t('find.tile.savedTitle')) : t('find.tile.saveIdea')}
          onClick={() => {
            setPop(true)
            onToggleSave()
          }}
          onAnimationEnd={() => setPop(false)}
        >
          {saved ? (where ? `✓ ${where.short}` : t('find.tile.savedShort')) : t('find.tile.plusSave')}
        </button>
    </article>
  )
}
