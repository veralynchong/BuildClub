import { useState } from 'react'
import { t } from '../../../lib/i18n'
import { ErrorText } from '../../ErrorText'
import { getSpeechCaptions, NotReady } from '../../../lib/editor/aiApi'
import { speechKey, withSpeechCaptions } from '../../../lib/editor/aiEdit'
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
  planId: string | null // where the speech of the takes is read from; null for a workspace
  onAi: (p: EditProject, label: string) => void // a change the AI made: it can be undone from the AI tab
  undo: { label: string } | null
  onUndo: () => void
}

// Captions on or off, and their words. Without a voiceover the captions are the shots' lines (one field per shot, the
// pages below it are only shown); with one they follow the voice and each page can be fixed (F26, F27).
export function CaptionTool({ project, lines, shotIds, words, readOnly, onProject, planId, onAi, undo, onUndo }: Props) {
  const mode = captionMode(project, words)
  return (
    <div className="cv-ed-tool">
      <label className="cv-ed-switch">
        <input
          type="checkbox"
          checked={project.captions.enabled}
          disabled={readOnly}
          onChange={(e) => onProject({ ...project, captions: { ...project.captions, enabled: e.target.checked } })}
        />
        <span>{t('editor.cap.show')}</span>
      </label>
      {planId && <SpeechSource project={project} readOnly={readOnly} planId={planId} onProject={onProject} onAi={onAi} />}
      <p className="muted small">{mode === 'speech' ? t('editor.cap.mode.speech') : mode === 'voice' ? t('editor.cap.mode.voice') : t('editor.cap.mode.lines')}</p>
      {undo && mode === 'speech' && (
        <div className="cv-ed-ai-undo">
          <button type="button" className="btn btn-ghost btn-sm" disabled={readOnly} onClick={onUndo}>{t('editor.ai.undo')}</button>
        </div>
      )}
      {mode === 'speech' ? (
        <SpeechLines project={project} readOnly={readOnly} onProject={onProject} />
      ) : mode === 'voice' ? (
        <VoicePages project={project} words={words} readOnly={readOnly} onProject={onProject} />
      ) : (
        <LinePages project={project} lines={lines} shotIds={shotIds} readOnly={readOnly} onProject={onProject} />
      )}
    </div>
  )
}

function LinePages({ project, lines, shotIds, readOnly, onProject }: Pick<Props, 'project' | 'lines' | 'shotIds' | 'readOnly' | 'onProject'>) {
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

// Which captions the video shows: the shots' lines (or the voiceover), or the words spoken in the clips. Choosing speech
// makes the lines at once when there are none.
function SpeechSource({ project, readOnly, planId, onProject, onAi }: Pick<Props, 'project' | 'readOnly' | 'onProject' | 'onAi'> & { planId: string }) {
  const speech = project.captions.source === 'speech'
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const made = project.captions.speech?.length ?? 0
  const stale = speech && made > 0 && project.captions.speechKey !== speechKey(project)

  const make = async () => {
    setBusy(true)
    setNote('')
    setError('')
    try {
      const r = await getSpeechCaptions(planId, project.clips)
      if (r.status === 'ok') onAi(withSpeechCaptions(project, r.entries), t('editor.cap.speech.made', { n: r.entries.length }))
      else setNote(t(r.status === 'unavailable' ? 'editor.cap.speech.noWhisper' : 'editor.cap.speech.none'))
    } catch (e) {
      if (e instanceof NotReady) setNote(t('editor.cap.speech.waiting'))
      else setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }
  const choose = (toSpeech: boolean) => {
    if (!toSpeech) return onProject({ ...project, captions: { ...project.captions, source: 'lines' } })
    onProject({ ...project, captions: { ...project.captions, source: 'speech' } })
    if (made === 0) void make()
  }
  return (
    <>
      <fieldset className="cv-ed-choice cv-ed-capsource">
        <legend>{t('editor.cap.source')}</legend>
        <label><input type="radio" name="cap-source" checked={!speech} disabled={readOnly} onChange={() => choose(false)} /> {t('editor.cap.source.auto')}</label>
        <label><input type="radio" name="cap-source" checked={speech} disabled={readOnly || busy} onChange={() => choose(true)} /> {t('editor.cap.source.speech')}</label>
      </fieldset>
      {speech && (
        <div className="cv-ed-tool-row">
          <button type="button" className="btn btn-ghost btn-sm" disabled={readOnly || busy} onClick={() => void make()}>
            {busy ? t('editor.cap.speech.working') : t(made > 0 ? 'editor.cap.speech.again' : 'editor.cap.speech.make')}
          </button>
        </div>
      )}
      {stale && <p className="muted small" role="status">{t('editor.cap.speech.stale')}</p>}
      {note && <p className="muted small" role="status">{note}</p>}
      {error && <ErrorText text={error} />}
    </>
  )
}

// The caption lines made from speech, each with editable text.
function SpeechLines({ project, readOnly, onProject }: Pick<Props, 'project' | 'readOnly' | 'onProject'>) {
  const lines = project.captions.speech ?? []
  if (lines.length === 0) return <p className="muted small">{t('editor.cap.speech.empty')}</p>
  return (
    <fieldset className="cv-ed-choice cv-ed-seg">
      {lines.map((e) => (
        <label key={e.id} className="cv-ed-page">
          <span className="small muted">{t('editor.cap.pageTime', { start: round1(e.start) })}</span>
          <input
            type="text"
            aria-label={t('editor.cap.speech.lineText', { start: round1(e.start) })}
            maxLength={MAX_TEXT_CHARS}
            value={e.text}
            disabled={readOnly}
            onChange={(ev) => onProject({ ...project, captions: { ...project.captions, speech: lines.map((x) => (x.id === e.id ? { ...x, text: ev.target.value } : x)) } })}
          />
        </label>
      ))}
    </fieldset>
  )
}
