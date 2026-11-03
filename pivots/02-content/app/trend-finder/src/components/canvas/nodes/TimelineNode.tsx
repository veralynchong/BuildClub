import { useMemo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Player } from '@remotion/player'
import { t } from '../../../lib/i18n'
import { clipLength, reelDurationInFrames, timelineSummary } from '../../../lib/editor/timeline'
import { previewInput, shotLines } from '../../../lib/editor/preview'
import type { Clip } from '../../../lib/editor/types'
import { Reel } from '../../../remotion/Reel'
import { fillShotIds } from '../../../lib/storyboard'
import { clipLabel } from '../../editor/clipName'
import { useCanvas } from './ctx'

const EMPTY_FLEX = 3 // a shot with no clip yet takes about a typical shot's room in the strip

type Block = { key: string; flex: number; label: string; line: string; clip: Clip | null }

// The Timeline node (spec §7.1): a 9:16 preview, one block per clip in shot order (striped where a shot has none yet),
// the captions row, and the way into the full editor. Virtual: built from the edit project, never saved.
export function TimelineNode() {
  const { editProject: project, clipUrls, brand, shots: planShots, gens, takes, openEditor } = useCanvas()
  const shots = useMemo(() => fillShotIds(planShots), [planShots]) // the same shot ids the editor uses
  const order = useMemo(() => shots.flatMap((s) => (s.id ? [s.id] : [])), [shots])
  const sum = timelineSummary(project, order)
  const lines = useMemo(() => shotLines(shots), [shots])
  const input = useMemo(() => (project && project.clips.length ? previewInput(project, clipUrls, shots, brand) : null), [project, clipUrls, shots, brand])

  const blocks: Block[] = []
  const clips = project?.clips ?? []
  order.forEach((id, i) => {
    const mine = clips.filter((c) => c.source.shotId === id)
    if (!mine.length) blocks.push({ key: `empty-${id}`, flex: EMPTY_FLEX, label: t('editor.clip.shot', { n: i + 1 }), line: lines[id] ?? '', clip: null })
    for (const c of mine) blocks.push({ key: c.id, flex: clipLength(c), label: clipLabel(c.source, shots, gens, takes), line: lines[id] ?? '', clip: c })
  })
  for (const c of clips) {
    if (!c.source.shotId || !order.includes(c.source.shotId)) blocks.push({ key: c.id, flex: clipLength(c), label: clipLabel(c.source, shots, gens, takes), line: '', clip: c })
  }
  const captionsOn = !!project?.captions.enabled

  return (
    <div className="cv-node cv-card cv-timeline-node">
      <div className="cv-card-head">
        <span className="cv-node-title">{t('canvas.timeline.title', { sec: Math.round(sum.seconds) })}</span>
        <span className="cv-card-status">{t('canvas.timeline.ready', { ready: sum.ready, total: sum.total })}</span>
      </div>
      <div className="cv-tl-preview nodrag nopan nowheel" role="group" aria-label={t('canvas.timeline.preview')}>
        {input && project ? (
          <Player
            component={Reel}
            inputProps={input}
            durationInFrames={reelDurationInFrames(project)}
            compositionWidth={1080}
            compositionHeight={1920}
            fps={30}
            controls
            style={{ width: '100%', aspectRatio: '9 / 16' }}
          />
        ) : (
          <p className="cv-tl-empty small muted">{t('canvas.timeline.empty')}</p>
        )}
      </div>
      <ol className="cv-tl-strip" aria-label={t('canvas.timeline.clips')}>
        {blocks.map((b) => (
          <li key={b.key} className={b.clip ? 'cv-tl-clip' : 'cv-tl-clip is-empty'} style={{ flex: b.flex }} title={b.label}>
            {b.label}
          </li>
        ))}
      </ol>
      <ol className={captionsOn ? 'cv-tl-captions' : 'cv-tl-captions is-off'} aria-label={t('canvas.timeline.captions')}>
        {blocks.map((b) => (
          <li key={b.key} style={{ flex: b.flex }} title={b.line}>
            {b.line}
          </li>
        ))}
      </ol>
      <div className="cv-tl-foot">
        <button type="button" className="btn btn-ghost btn-sm nodrag" onClick={() => openEditor()}>
          {t('canvas.timeline.expand')}
        </button>
        <button type="button" className="btn btn-ghost btn-sm nodrag" onClick={() => openEditor(true)}>
          {t('canvas.timeline.export')}
        </button>
      </div>
      <Handle id="in:clips" type="target" position={Position.Left} isConnectable={false} className="cv-handle cv-media-video" aria-label={t('canvas.timeline.clips')} data-label={t('canvas.timeline.clips')} />
    </div>
  )
}
