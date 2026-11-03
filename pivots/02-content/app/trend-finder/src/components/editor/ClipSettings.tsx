import { useState } from 'react'
import { t } from '../../lib/i18n'
import { clipLength, parseSeconds, setShotCaption, trimClip } from '../../lib/editor/timeline'
import type { Clip, EditProject } from '../../lib/editor/types'

interface Props {
  project: EditProject
  clip: Clip | null // the selected timeline clip
  name: string // its label, "Shot 1 · v3"
  sourceDuration: number // how long its footage is, the longest it can be trimmed to
  nodeId: string | null // its node on the canvas, null when that is gone
  readOnly: boolean
  onProject: (p: EditProject) => void
  onJump: (nodeId: string) => void
}

const fmt = (sec: number) => (Math.round(sec * 10) / 10).toString()

// The Clips tab: the selected clip's length, whether its shot shows a caption, and a jump to its node on the canvas.
// No transition setting: the edit project has none (plan "Spec gaps" 2).
export function ClipSettings({ project, clip, name, sourceDuration, nodeId, readOnly, onProject, onJump }: Props) {
  if (!clip) return <p className="muted small">{t('editor.clipSet.none')}</p>
  return <Settings key={clip.id} project={project} clip={clip} name={name} sourceDuration={sourceDuration} nodeId={nodeId} readOnly={readOnly} onProject={onProject} onJump={onJump} />
}

function Settings({ project, clip, name, sourceDuration, nodeId, readOnly, onProject, onJump }: Props & { clip: Clip }) {
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
