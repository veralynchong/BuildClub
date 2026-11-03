import { t } from '../../../lib/i18n'
import { captionMode, captionPages, lineCaptions, pageEnd, pagesWithEdits, segmentPages } from '../../../lib/editor/captions'
import { MAX_TEXT_CHARS, setShotCaption, totalLength, updateVoice } from '../../../lib/editor/timeline'
import type { EditProject, Word } from '../../../lib/editor/types'

const round1 = (n: number) => Math.round(n * 10) / 10

interface Props {
  project: EditProject
  lines: Record<string, string> // shot id to its script line
  shotIds: string[] // the plan's shots in order, to number them
  words: Record<string, Word[]> // voiceover id to its word times
  readOnly: boolean
  onProject: (p: EditProject) => void
}

// Captions on or off, and their words. Without a voiceover the captions are the shots' lines (one field per shot, the
// pages below it are only shown); with one they follow the voice and each page can be fixed (F26, F27).
export function CaptionTool({ project, lines, shotIds, words, readOnly, onProject }: Props) {
  const mode = captionMode(project, words)
  return (
    <div className="cv-ed-tool">
      <label className="cv-ed-switch">
        <input
          type="checkbox"
          checked={project.captions.enabled}
          disabled={readOnly}
          onChange={(e) => onProject({ ...project, captions: { enabled: e.target.checked } })}
        />
        <span>{t('editor.cap.show')}</span>
      </label>
      <p className="muted small">{mode === 'voice' ? t('editor.cap.mode.voice') : t('editor.cap.mode.lines')}</p>
      {mode === 'voice' ? (
        <VoicePages project={project} words={words} readOnly={readOnly} onProject={onProject} />
      ) : (
        <LinePages project={project} lines={lines} shotIds={shotIds} readOnly={readOnly} onProject={onProject} />
      )}
    </div>
  )
}

function LinePages({ project, lines, shotIds, readOnly, onProject }: Omit<Props, 'words'>) {
  const shown = [...new Set(project.clips.flatMap((c) => (c.source.shotId ? [c.source.shotId] : [])))]
  const pages = captionPages(lineCaptions(project, lines))
  if (shown.length === 0 || (pages.length === 0 && shown.every((id) => !lines[id] && !project.clips.some((c) => c.source.shotId === id && c.caption !== undefined)))) {
    return <p className="muted small">{t('editor.cap.none')}</p>
  }
  return (
    <>
      {shown.map((id) => {
        const clips = project.clips.filter((c) => c.source.shotId === id)
        const override = clips.find((c) => c.caption !== undefined)
        const n = shotIds.indexOf(id) + 1
        return (
          <div key={id} className="cv-ed-field">
            <label className="cv-ed-field">
              <span>{t('editor.cap.shotText', { n: n || '?' })}</span>
              <textarea
                rows={2}
                value={override ? (override.caption as string) : (lines[id] ?? '')}
                disabled={readOnly}
                onChange={(e) => onProject(setShotCaption(project, id, e.target.value))}
              />
            </label>
            {override && (
              <div>
                <button type="button" className="btn btn-ghost btn-sm" disabled={readOnly} onClick={() => onProject(setShotCaption(project, id, undefined))}>
                  {t('editor.cap.reset')}
                </button>
              </div>
            )}
          </div>
        )
      })}
      <h4 className="cv-ed-sub">{t('editor.cap.pages')}</h4>
      <ol className="cv-ed-pages">
        {pages.map((pg, i) => (
          <li key={i} className="small muted">
            {t('editor.cap.page', { start: round1(pg.startMs / 1000), end: round1(pageEnd(pg) / 1000), text: pg.text })}
          </li>
        ))}
      </ol>
    </>
  )
}

function VoicePages({ project, words, readOnly, onProject }: Pick<Props, 'project' | 'words' | 'readOnly' | 'onProject'>) {
  const total = totalLength(project)
  return (
    <>
      {project.voiceover.map((seg, si) => {
        const raw = segmentPages(seg, words, total)
        if (raw.length === 0) return null
        const shown = pagesWithEdits(raw, seg.edits)
        return (
          <fieldset key={seg.id} className="cv-ed-choice cv-ed-seg">
            <legend>{t('editor.cap.seg', { n: si + 1 })}</legend>
            {raw.map((pg, i) => (
              <label key={i} className="cv-ed-page">
                <span className="small muted">{t('editor.cap.pageTime', { start: round1(pg.startMs / 1000) })}</span>
                <input
                  type="text"
                  aria-label={t('editor.cap.pageText', { n: i + 1, seg: si + 1 })}
                  maxLength={MAX_TEXT_CHARS}
                  value={shown[i].text}
                  disabled={readOnly}
                  onChange={(e) => {
                    const edits = { ...seg.edits }
                    if (e.target.value === pg.text) delete edits[String(i)]
                    else edits[String(i)] = e.target.value
                    onProject(updateVoice(project, seg.id, { edits }))
                  }}
                />
              </label>
            ))}
          </fieldset>
        )
      })}
    </>
  )
}
