import { useEffect, useState } from 'react'
import { t } from '../../../lib/i18n'
import type { Key } from '../../../lib/i18n'
import { MAX_TEXTS, MAX_TEXT_CHARS, addText, newTextId, parseSeconds, removeText, totalLength, updateText } from '../../../lib/editor/timeline'
import type { EditProject, TextColor, TextItem, TextPosition } from '../../../lib/editor/types'

const POSITIONS: TextPosition[] = ['top', 'middle', 'bottom']
const COLORS: TextColor[] = ['brand', 'white', 'black']
const POS_LABEL: Record<TextPosition, Key> = { top: 'editor.text.pos.top', middle: 'editor.text.pos.middle', bottom: 'editor.text.pos.bottom' }
const COLOR_LABEL: Record<TextColor, Key> = { brand: 'editor.text.color.brand', white: 'editor.text.color.white', black: 'editor.text.color.black' }

const round1 = (n: number) => Math.round(n * 10) / 10

interface Props {
  project: EditProject
  seconds: number // the playhead
  readOnly: boolean
  onProject: (p: EditProject) => void
}

// Words on screen: add one at the playhead, then change its words, timing, place and colour.
export function TextTool({ project, seconds, readOnly, onProject }: Props) {
  const [picked, setPicked] = useState<string | null>(null)
  const selected = project.texts.find((x) => x.id === picked) ?? project.texts[0] ?? null
  const noClips = project.clips.length === 0 || totalLength(project) <= 0
  const full = project.texts.length >= MAX_TEXTS

  const add = () => {
    const id = newTextId(project)
    const next = addText(project, seconds, t('editor.text.default'), id)
    if (next === project) return
    onProject(next)
    setPicked(id)
  }

  return (
    <div className="cv-ed-tool">
      <div className="cv-ed-tool-row">
        <button type="button" className="btn btn-primary btn-sm" disabled={readOnly || noClips || full} onClick={add}>
          {t('editor.text.add')}
        </button>
        {noClips ? <span className="muted small">{t('editor.text.noClips')}</span> : full ? <span className="muted small">{t('editor.text.full')}</span> : null}
      </div>
      {project.texts.length === 0 ? (
        <p className="muted small">{t('editor.text.none')}</p>
      ) : (
        <>
          <ul className="cv-ed-text-list" aria-label={t('editor.text.list')}>
            {project.texts.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  className="cv-ed-text-pick"
                  aria-pressed={x.id === selected?.id}
                  onClick={() => setPicked(x.id)}
                >
                  {t('editor.text.item', { text: x.text, start: round1(x.start), end: round1(x.end) })}
                </button>
              </li>
            ))}
          </ul>
          {selected && <TextFields key={selected.id} item={selected} project={project} readOnly={readOnly} onProject={onProject} />}
        </>
      )}
    </div>
  )
}

function TextFields({ item, project, readOnly, onProject }: { item: TextItem; project: EditProject; readOnly: boolean; onProject: (p: EditProject) => void }) {
  // The words are kept as typed here; an empty box is not saved (the project never holds empty text).
  const [draft, setDraft] = useState(item.text)
  // Start and end are drafts while typing; they are saved on blur or Enter, and a bad entry goes back to the saved value.
  const [startDraft, setStartDraft] = useState(String(round1(item.start)))
  const [endDraft, setEndDraft] = useState(String(round1(item.end)))
  const patch = (p: Partial<Omit<TextItem, 'id'>>) => onProject(updateText(project, item.id, p))
  const commit = (key: 'start' | 'end', raw: string, setRaw: (v: string) => void) => {
    const n = parseSeconds(raw)
    if (n === null) setRaw(String(round1(item[key])))
    else patch({ [key]: n })
  }
  // The project may clamp the value (or change it elsewhere), so show what it holds once it changes.
  useEffect(() => setStartDraft(String(round1(item.start))), [item.start])
  useEffect(() => setEndDraft(String(round1(item.end))), [item.end])
  return (
    <div className="cv-ed-fields">
      <label className="cv-ed-field">
        <span>{t('editor.text.words')}</span>
        <textarea
          rows={2}
          maxLength={MAX_TEXT_CHARS}
          value={draft}
          disabled={readOnly}
          onChange={(e) => {
            setDraft(e.target.value)
            if (e.target.value.trim()) patch({ text: e.target.value })
          }}
          onBlur={() => setDraft(item.text)}
        />
      </label>
      <div className="cv-ed-field-row">
        <label className="cv-ed-field">
          <span>{t('editor.text.start')}</span>
          <input type="number" min={0} step={0.1} value={startDraft} disabled={readOnly} onChange={(e) => setStartDraft(e.target.value)} onBlur={() => commit('start', startDraft, setStartDraft)} onKeyDown={(e) => e.key === 'Enter' && commit('start', startDraft, setStartDraft)} />
        </label>
        <label className="cv-ed-field">
          <span>{t('editor.text.end')}</span>
          <input type="number" min={0} step={0.1} value={endDraft} disabled={readOnly} onChange={(e) => setEndDraft(e.target.value)} onBlur={() => commit('end', endDraft, setEndDraft)} onKeyDown={(e) => e.key === 'Enter' && commit('end', endDraft, setEndDraft)} />
        </label>
      </div>
      <Choice legend={t('editor.text.position')} values={POSITIONS} labels={POS_LABEL} value={item.position} disabled={readOnly} onPick={(position) => patch({ position })} />
      <Choice legend={t('editor.text.color')} values={COLORS} labels={COLOR_LABEL} value={item.color} disabled={readOnly} onPick={(color) => patch({ color })} />
      <div>
        <button type="button" className="btn btn-ghost btn-sm" disabled={readOnly} onClick={() => onProject(removeText(project, item.id))}>
          {t('editor.text.remove')}
        </button>
      </div>
    </div>
  )
}

function Choice<V extends string>({ legend, values, labels, value, disabled, onPick }: { legend: string; values: V[]; labels: Record<V, Key>; value: V; disabled: boolean; onPick: (v: V) => void }) {
  return (
    <fieldset className="cv-ed-choice">
      <legend>{legend}</legend>
      {values.map((v) => (
        <button key={v} type="button" className="btn btn-ghost btn-sm" aria-pressed={v === value} disabled={disabled} onClick={() => onPick(v)}>
          {t(labels[v])}
        </button>
      ))}
    </fieldset>
  )
}
