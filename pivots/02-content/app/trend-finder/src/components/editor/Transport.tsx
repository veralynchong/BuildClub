import { t } from '../../lib/i18n'
import { MAX_PX, MIN_PX, timecode } from '../../lib/editor/lanes'
import { Icon, type IconName } from './icons'

const SPEEDS = [0.5, 1, 1.5, 2]

interface Props {
  playing: boolean
  frame: number
  frames: number // the reel's length in frames
  rate: number
  loop: boolean
  muted: boolean
  snap: boolean
  safe: boolean
  pxPerSec: number
  canSplit: boolean
  canDelete: boolean
  readOnly: boolean
  onToggle: () => void
  onSeek: (frame: number) => void
  onRate: (rate: number) => void
  onLoop: () => void
  onMute: () => void
  onSnap: () => void
  onSafe: () => void
  onFullscreen: () => void
  onFit: () => void
  onZoom: (px: number) => void
  onSplit: () => void
  onDelete: () => void
  marks: boolean // AI markers shown on the timeline
  markCount: number // how many AI suggestions are on the timeline
  onMarks: () => void
}

export function IconButton({ icon, label, pressed, disabled, onClick, className }: { icon: IconName; label: string; pressed?: boolean; disabled?: boolean; onClick: () => void; className?: string }) {
  return (
    <button type="button" className={`cv-ed-ib${className ? ` ${className}` : ''}`} aria-label={label} title={label} aria-pressed={pressed} disabled={disabled} onClick={onClick}>
      <Icon name={icon} />
    </button>
  )
}

// The bar between the preview and the timeline: edit actions and zoom-to-fit on the left, playback in the middle,
// snapping, safe zones, full screen and the timeline zoom on the right.
export function Transport(p: Props) {
  const last = Math.max(0, p.frames - 1)
  return (
    <div className="cv-ed-transport" role="toolbar" aria-label={t('editor.timeline')}>
      <div className="cv-ed-tp-group">
        <IconButton icon="scissors" label={t('editor.tp.split')} disabled={p.readOnly || !p.canSplit} onClick={p.onSplit} />
        <IconButton icon="trash" label={t('editor.tp.delete')} disabled={p.readOnly || !p.canDelete} onClick={p.onDelete} />
        <span className="cv-ed-tp-sep" aria-hidden="true" />
        <button type="button" className="cv-ed-ib cv-ed-ib-text" title={t('editor.tp.fit')} aria-label={t('editor.tp.fit')} onClick={p.onFit}>
          <Icon name="fit" />
          <span>{t('editor.tp.fitLabel')}</span>
        </button>
        <label className="cv-ed-tp-speed" title={t('editor.tp.speed')}>
          <Icon name="speed" />
          <select aria-label={t('editor.tp.speed')} value={p.rate} onChange={(e) => p.onRate(Number(e.target.value))}>
            {SPEEDS.map((s) => <option key={s} value={s}>{`${s}×`}</option>)}
          </select>
        </label>
      </div>
      <div className="cv-ed-tp-group cv-ed-tp-centre">
        <IconButton icon="loop" label={t('editor.tp.loop')} pressed={p.loop} onClick={p.onLoop} />
        <IconButton icon={p.muted ? 'volumeOff' : 'volume'} label={t(p.muted ? 'editor.tp.unmute' : 'editor.tp.mute')} pressed={p.muted} onClick={p.onMute} />
        <span className="cv-ed-tp-sep" aria-hidden="true" />
        <IconButton icon="toStart" label={t('editor.tp.start')} onClick={() => p.onSeek(0)} />
        <IconButton icon="stepBack" label={t('editor.tp.prev')} onClick={() => p.onSeek(Math.max(0, p.frame - 1))} />
        <button type="button" className="cv-ed-ib cv-ed-play" aria-label={t(p.playing ? 'editor.tp.pause' : 'editor.tp.play')} title={t(p.playing ? 'editor.tp.pause' : 'editor.tp.play')} onClick={p.onToggle}>
          <Icon name={p.playing ? 'pause' : 'play'} />
        </button>
        <IconButton icon="stepFwd" label={t('editor.tp.next')} onClick={() => p.onSeek(Math.min(last, p.frame + 1))} />
        <IconButton icon="toEnd" label={t('editor.tp.end')} onClick={() => p.onSeek(last)} />
        <span className="cv-ed-tp-time" aria-live="off">
          <span>{timecode(p.frame)}</span>
          <span className="cv-ed-tp-dim"> / {timecode(p.frames)}</span>
        </span>
      </div>
      <div className="cv-ed-tp-group cv-ed-tp-end">
        <button type="button" className="cv-ed-ib cv-ed-ib-text cv-ed-tp-marks" aria-pressed={p.marks} aria-label={`${t('editor.tp.marks')} (${t('editor.tp.marksCount', { n: p.markCount })})`} title={`${t('editor.tp.marks')}: ${t('editor.tp.marksCount', { n: p.markCount })}`} onClick={p.onMarks}>
          <Icon name="sparkles" />
          {p.markCount > 0 && <span className="cv-ed-badge" aria-hidden="true">{p.markCount}</span>}
        </button>
        <IconButton icon="magnet" label={t('editor.tp.snap')} pressed={p.snap} onClick={p.onSnap} />
        <IconButton icon="safe" label={t('editor.tp.safe')} pressed={p.safe} onClick={p.onSafe} />
        <IconButton icon="fullscreen" label={t('editor.tp.fullscreen')} onClick={p.onFullscreen} />
        <span className="cv-ed-tp-sep" aria-hidden="true" />
        <IconButton icon="zoomOut" label={t('editor.zoomOut')} disabled={p.pxPerSec <= MIN_PX} onClick={() => p.onZoom(Math.max(MIN_PX, p.pxPerSec / 1.5))} />
        <input className="cv-ed-tp-zoom" type="range" min={MIN_PX} max={MAX_PX} value={Math.round(p.pxPerSec)} aria-label={t('editor.zoom')} onChange={(e) => p.onZoom(Number(e.target.value))} />
        <IconButton icon="zoomIn" label={t('editor.zoomIn')} disabled={p.pxPerSec >= MAX_PX} onClick={() => p.onZoom(Math.min(MAX_PX, p.pxPerSec * 1.5))} />
      </div>
    </div>
  )
}
