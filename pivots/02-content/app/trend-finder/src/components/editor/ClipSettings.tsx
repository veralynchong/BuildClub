import { useState } from 'react'
import { t } from '../../lib/i18n'
import { Icon } from './icons'
import { clipLength, parseSeconds, setClipAudio, setClipFit, setShotCaption, trimClip } from '../../lib/editor/timeline'
import type { Clip, EditProject } from '../../lib/editor/types'

interface Props {
  project: EditProject
  clip: Clip | null // the selected timeline clip
  name: string // its label, "Shot 1 · v3"
  sourceDuration: number // how long its footage is, the longest it can be trimmed to
  silent: boolean // its footage has no sound track
  nodeId: string | null // its node on the canvas, null when that is gone
  readOnly: boolean
  onProject: (p: EditProject) => void
  onJump: (nodeId: string) => void
}

const fmt = (sec: number) => (Math.round(sec * 10) / 10).toString()

// The Clips tab: the selected clip's length, fit, sound, whether its shot shows a caption, and a jump to its node on the canvas.
// No transition setting: the edit project has none (plan "Spec gaps" 2).
export function ClipSettings({ project, clip, name, sourceDuration, silent, nodeId, readOnly, onProject, onJump }: Props) {
  if (!clip) return <p className="muted small">{t('editor.clipSet.none')}</p>
  return <Settings key={clip.id} project={project} clip={clip} name={name} sourceDuration={sourceDuration} silent={silent} nodeId={nodeId} readOnly={readOnly} onProject={onProject} onJump={onJump} />
}

function Settings({ project, clip, name, sourceDuration, silent, nodeId, readOnly, onProject, onJump }: Props & { clip: Clip }) {
  const len = clipLength(clip)
  const [draft, setDraft] = useState<string | null>(null) // the length being typed, applied on Enter or leaving the field
  const shotId = clip.source.shotId
  const override = project.clips.find((c) => c.source.shotId === shotId && c.caption !== undefined)?.caption
  const captionOn = override !== ''
  const apply = () => {
    const v = draft === null ? null : parseSeconds(draft)
    setDraft(null)
    if (v !== null) onProject(trimClip(project, clip.id, 'out', clip.in + v, sourceDuration))
  }
  return (
    <div className="cv-ed-tool cv-ed-clipset">
      <h3>{name}</h3>
      <label className="cv-ed-field">
        <span>{t('editor.clipSet.length')}</span>
        <input
          type="number"
          min={0.2}
          step={0.1}
          value={draft ?? fmt(len)}
          disabled={readOnly}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={apply}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
        />
      </label>
      <div className="cv-ed-field" role="group" aria-label={t('editor.clipSet.fit')}>
        <span>{t('editor.clipSet.fit')}</span>
        <div className="cv-ed-fitpick">
          {(['fill', 'fit'] as const).map((f) => (
            <button key={f} type="button" className={`btn btn-sm ${(clip.fit ?? 'fill') === f ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={(clip.fit ?? 'fill') === f} disabled={readOnly} onClick={() => onProject(setClipFit(project, clip.id, f))}>
              {t(`editor.clipSet.fit.${f}`)}
            </button>
          ))}
        </div>
      </div>
      <p className="muted small">{t((clip.fit ?? 'fill') === 'fit' ? 'editor.clipSet.fit.fitHelp' : 'editor.clipSet.fit.fillHelp')}</p>
      <div className="cv-ed-field" role="group" aria-label={t('editor.clipSet.sound')}>
        <span>{t('editor.clipSet.sound')}</span>
        {silent ? (
          <p className="muted small">{t('editor.audio.silent')}</p>
        ) : (
          <div className="cv-ed-sound">
            <button type="button" className="cv-ed-ib" aria-pressed={clip.muted} aria-label={t(clip.muted ? 'editor.audio.unmute' : 'editor.audio.mute')} title={t(clip.muted ? 'editor.audio.unmute' : 'editor.audio.mute')} disabled={readOnly} onClick={() => onProject(setClipAudio(project, clip.id, { muted: !clip.muted }))}>
              <Icon name={clip.muted ? 'volumeOff' : 'volume'} />
            </button>
            <input
              type="range"
              min={0}
              max={200}
              step={5}
              value={Math.round(clip.volume * 100)}
              aria-label={t('editor.audio.volume', { name })}
              disabled={readOnly || clip.muted}
              onChange={(e) => onProject(setClipAudio(project, clip.id, { volume: Number(e.target.value) / 100 }))}
            />
            <span className="cv-ed-sound-pct">{clip.muted ? '0%' : `${Math.round(clip.volume * 100)}%`}</span>
          </div>
        )}
      </div>
      {shotId && (
        <>
          <label className="cv-ed-switch">
            <input type="checkbox" checked={captionOn} disabled={readOnly} onChange={(e) => onProject(setShotCaption(project, shotId, e.target.checked ? undefined : ''))} />
            <span>{t('editor.clipSet.caption')}</span>
          </label>
          {!project.captions.enabled && <p className="muted small">{t('editor.clipSet.captionsOff')}</p>}
        </>
      )}
      <div>
        <button type="button" className="btn btn-ghost btn-sm" disabled={!nodeId} onClick={() => nodeId && onJump(nodeId)}>
          {t('editor.clipSet.show')}
        </button>
        {!nodeId && <p className="muted small">{t('editor.clipSet.noNode')}</p>}
      </div>
    </div>
  )
}
