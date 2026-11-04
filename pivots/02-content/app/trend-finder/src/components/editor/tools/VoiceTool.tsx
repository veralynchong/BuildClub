import { type ResourceInput } from '../../../lib/canvas/resource.ts'
import { useEffect, useRef, useState } from 'react'
import { ff } from '../../../lib/strings/freeform'
import { t } from '../../../lib/i18n'
import { getModels } from '../../../lib/canvas/api'
import type { GenModel } from '../../../lib/canvas/types'
import { deleteVoice, putVoice, quoteTts, type PendingVoice, type VoiceInfo } from '../../../lib/editor/api'
import { ttsDefaultText, MAX_VOICE_UNITS } from '../../../lib/editor/captions'
import { MAX_VOICE, addVoice, removeVoice, updateVoice, type FlushResult } from '../../../lib/editor/timeline'
import type { EditProject, VoiceSeg } from '../../../lib/editor/types'
import { ErrorText } from '../../ErrorText'

// The voiceover goes back where it was when the removal could not be saved.
function addVoiceBack(now: EditProject, before: EditProject, id: string): EditProject {
  const seg = before.voiceover.find((v) => v.id === id)
  return seg ? addVoice(now, seg) : now
}

const MAX_BYTES = 20 * 1024 * 1024
const round1 = (n: number) => Math.round(n * 10) / 10
type Source = VoiceSeg['source']

interface Props {
  ideaId: ResourceInput
  project: EditProject
  current: () => EditProject | null // the newest project, even before React has rendered it
  flush: () => Promise<FlushResult>
  voices: Record<string, VoiceInfo>
  adopt: (info: VoiceInfo, source: Source) => void // puts a new voice on the timeline at the playhead
  onVoiceGone: (id: string) => void
  tts: { busy: boolean; error: string | null; run: (text: string, model: string) => void } // lives in EditorPanel
  pending: PendingVoice[] // AI voice jobs never added: finished ones to add, and ones still going
  onImport: (genId: string) => void
  lineTexts: string[] // every shot's script line, in order
  readOnly: boolean
  onProject: (p: EditProject) => void
}

// Voiceovers: record, upload, or have an AI voice read the lines. Each one has a start, a volume and a remove button.
export function VoiceTool({ ideaId, project, current, flush, voices, adopt, onVoiceGone, tts, pending, onImport, lineTexts, readOnly, onProject }: Props) {
  const [busy, setBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const rec = useRef<{ mr: MediaRecorder; stream: MediaStream } | null>(null)
  const off = readOnly || busy || recording
  const full = project.voiceover.length >= MAX_VOICE
  const workspace = typeof ideaId !== 'string' && ideaId.kind === 'workspace'

  useEffect(
    () => () => {
      const r = rec.current
      if (r) {
        r.mr.onstop = null
        if (r.mr.state !== 'inactive') r.mr.stop()
        r.stream.getTracks().forEach((tr) => tr.stop())
      }
    },
    [],
  )

  const take = (info: VoiceInfo, source: Source) => {
    adopt(info, source)
    setNotice(info.words === null ? t('editor.voice.noWords') : null)
  }

  const send = async (file: Blob, source: 'recording' | 'upload') => {
    setBusy(true)
    setError(null)
    try {
      take(await putVoice(ideaId, file, source), source)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const pick = (f: File | undefined) => {
    if (!f) return
    if (f.size > MAX_BYTES) return setError(t('editor.voice.tooBig'))
    void send(f, 'upload')
  }

  const record = async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported('audio/webm')) {
      return setError(t('editor.voice.noRecorder'))
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return setError(t('editor.voice.noMic'))
    }
    const chunks: Blob[] = []
    let mr: MediaRecorder
    try {
      mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    } catch {
      stream.getTracks().forEach((tr) => tr.stop())
      return setError(t('editor.voice.noRecorder'))
    }
    mr.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)
    mr.onstop = () => {
      stream.getTracks().forEach((tr) => tr.stop())
      rec.current = null
      setRecording(false)
      void send(new Blob(chunks, { type: 'audio/webm' }), 'recording')
    }
    rec.current = { mr, stream }
    mr.start()
    setRecording(true)
  }

  // The saved project must stop using the file before the server deletes it (it answers 409 otherwise).
  const remove = async (id: string) => {
    setBusy(true)
    setError(null)
    const before = current() ?? project
    try {
      onProject(removeVoice(before, id))
      if ((await flush()) !== 'saved') {
        onProject(current() && current() !== before ? addVoiceBack(current() as EditProject, before, id) : before)
        throw new Error(t('editor.err.save'))
      }
      if (!workspace) { await deleteVoice(ideaId, id); onVoiceGone(id) }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cv-ed-tool">
      {workspace ? <p className="muted small">{ff('canvasVoice')}</p> : <div className="cv-ed-tool-row">
        {recording ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => rec.current?.mr.stop()}>{t('editor.voice.stop')}</button>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm" disabled={off || full} onClick={() => void record()}>{t('editor.voice.record')}</button>
        )}
        <label className={`btn btn-ghost btn-sm cv-ed-upload${off || full ? ' is-disabled' : ''}`} aria-disabled={off || full}>
          {busy ? t('editor.voice.uploading') : t('editor.voice.upload')}
          <input
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg"
            hidden
            disabled={off || full}
            onChange={(e) => {
              pick(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
        {recording && <span className="muted small" role="status">{t('editor.voice.recording')}</span>}
        {full && <span className="muted small">{t('editor.voice.full')}</span>}
      </div>}
      {!workspace && <TtsSection ideaId={ideaId} lineTexts={lineTexts} disabled={off || full} tts={tts} onError={setError} />}
      {!workspace && pending.map((g) => (
        <div key={g.id} className="cv-ed-tool-row">
          {g.status === 'done' ? (
            <>
              <span className="small">{t('editor.tts.pending')}</span>
              <button type="button" className="btn btn-primary btn-sm" disabled={off || full || tts.busy} onClick={() => onImport(g.id)}>{t('editor.tts.import')}</button>
            </>
          ) : (
            <span className="small" role="status">{t('editor.tts.inProgress')}</span>
          )}
        </div>
      ))}
      {tts.error && <p className="cv-ed-error small" role="alert"><ErrorText text={tts.error} /></p>}
      {notice && <p className="muted small" role="status">{notice}</p>}
      {error && <p className="cv-ed-error small" role="alert"><ErrorText text={error} /></p>}
      {project.voiceover.length === 0 ? (
        <p className="muted small">{t('editor.voice.none')}</p>
      ) : (
        <ul className="cv-ed-voice-list" aria-label={t('editor.voice.list')}>
          {project.voiceover.map((v, i) => (
            <li key={v.id} className="cv-ed-voice">
              <strong className="small">
                {t('editor.voice.seg', { n: i + 1, source: t(`editor.voice.source.${v.source}` as const), sec: round1(voices[v.id]?.duration ?? 0) })}
              </strong>
              <div className="cv-ed-field-row">
                <label className="cv-ed-field">
                  <span>{t('editor.voice.start')}</span>
                  <input type="number" min={0} step={0.1} value={round1(v.start)} disabled={off} onChange={(e) => onProject(updateVoice(project, v.id, { start: Math.max(0, Number(e.target.value) || 0) }))} />
                </label>
                <label className="cv-ed-field cv-ed-volume">
                  <span>{t('editor.voice.volume')}</span>
                  <input type="range" min={0} max={200} step={5} value={Math.round(v.volume * 100)} disabled={off} onChange={(e) => onProject(updateVoice(project, v.id, { volume: Number(e.target.value) / 100 }))} />
                  <span className="cv-ed-audio-pct">{Math.round(v.volume * 100)}%</span>
                </label>
              </div>
              <div>
                <button type="button" className="btn btn-ghost btn-sm" disabled={off} onClick={() => void remove(v.id)}>{t('editor.voice.remove')}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface TtsProps {
  ideaId: ResourceInput
  lineTexts: string[]
  disabled: boolean
  tts: Props['tts']
  onError: (message: string | null) => void
}

type Ask = { usd: number; remaining: number }

// An AI voice reads the text. It asks for the price first and spends only after the person confirms.
function TtsSection({ ideaId, lineTexts, disabled, tts, onError }: TtsProps) {
  const [models, setModels] = useState<GenModel[] | null>(null)
  const [model, setModel] = useState('')
  const [initial] = useState(() => ttsDefaultText(lineTexts))
  const [text, setText] = useState(initial.text)
  const [ask, setAsk] = useState<Ask | null>(null)
  const [quoting, setQuoting] = useState(false)
  // A price under half a cent would show as US$0.00, which reads as free.
  const tiny = ask !== null && ask.usd > 0 && ask.usd < 0.005
  const priceText = ask ? t(tiny ? 'editor.tts.priceTiny' : 'editor.tts.price', { usd: ask.usd.toFixed(2), left: ask.remaining.toFixed(2) }) : ''
  const state = tts.busy ? 'working' : quoting ? 'quoting' : 'idle'

  useEffect(() => {
    let cancelled = false
    getModels().then(
      (all) => {
        if (cancelled) return
        const voice = all.filter((m) => m.kind === 'voice')
        setModels(voice)
        setModel((cur) => cur || (voice.find((m) => m.available)?.id ?? ''))
      },
      () => !cancelled && setModels([]),
    )
    return () => {
      cancelled = true
    }
  }, [])

  const quote = async () => {
    onError(null)
    if (!text.trim()) return onError(t('editor.tts.empty'))
    setQuoting(true)
    try {
      setAsk(await quoteTts(ideaId, text, model))
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    } finally {
      setQuoting(false)
    }
  }

  const confirm = () => {
    setAsk(null)
    tts.run(text, model)
  }

  return (
    <fieldset className="cv-ed-choice cv-ed-tts">
      <legend>{t('editor.tts.title')}</legend>
      {models !== null && models.length === 0 ? (
        <p className="muted small">{t('editor.tts.noModel')}</p>
      ) : (
        <>
          <label className="cv-ed-field">
            <span>{t('editor.tts.model')}</span>
            <select value={model} disabled={disabled || state !== 'idle'} onChange={(e) => { setModel(e.target.value); setAsk(null) }}>
              {(models ?? []).map((m) => (
                <option key={m.id} value={m.id} disabled={!m.available} title={!m.available ? t('canvas.gen.needsKey') : undefined}>
                  {m.label}
                  {!m.available ? ` · ${t('canvas.gen.needsKey')}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="cv-ed-field">
            <span>{t('editor.tts.text')}</span>
            <textarea rows={4} value={text} disabled={disabled || state !== 'idle'} onChange={(e) => { setText(e.target.value); setAsk(null) }} />
          </label>
          {initial.truncated && <p className="muted small">{t('editor.tts.truncated', { max: MAX_VOICE_UNITS })}</p>}
          {ask ? (
            <div className="cv-ed-tool-row" role="group" aria-label={priceText}>
              <strong className="small">{priceText}</strong>
              <button type="button" className="btn btn-primary btn-sm" disabled={disabled || tts.busy} onClick={confirm}>{t('editor.tts.confirm')}</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsk(null)}>{t('editor.tts.cancel')}</button>
            </div>
          ) : (
            <div>
              <button type="button" className="btn btn-ghost btn-sm" disabled={disabled || !model || state !== 'idle'} onClick={() => void quote()}>
                {state === 'working' ? t('editor.tts.working') : t('editor.tts.quote')}
              </button>
            </div>
          )}
        </>
      )}
    </fieldset>
  )
}
