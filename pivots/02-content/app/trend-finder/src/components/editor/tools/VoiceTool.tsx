import { useEffect, useRef, useState } from 'react'
import { t } from '../../../lib/i18n'
import { getModels, pollGen } from '../../../lib/canvas/api'
import type { GenModel } from '../../../lib/canvas/types'
import { deleteVoice, importTts, putVoice, quoteTts, startTts, type VoiceInfo } from '../../../lib/editor/api'
import { ttsDefaultText, MAX_VOICE_UNITS } from '../../../lib/editor/captions'
import { MAX_VOICE, addVoice, removeVoice, updateVoice, type FlushResult } from '../../../lib/editor/timeline'
import type { EditProject, VoiceSeg } from '../../../lib/editor/types'
import { ErrorText } from '../../ErrorText'

const MAX_BYTES = 20 * 1024 * 1024
const round1 = (n: number) => Math.round(n * 10) / 10
type Source = VoiceSeg['source']

interface Props {
  ideaId: string
  project: EditProject
  current: () => EditProject | null // the newest project, even before React has rendered it
  flush: () => Promise<FlushResult>
  voices: Record<string, VoiceInfo>
  onVoice: (v: VoiceInfo) => void
  onVoiceGone: (id: string) => void
  lineTexts: string[] // every shot's script line, in order
  seconds: number // the playhead
  readOnly: boolean
  onProject: (p: EditProject) => void
}

// Voiceovers: record, upload, or have an AI voice read the lines. Each one has a start, a volume and a remove button.
export function VoiceTool({ ideaId, project, current, flush, voices, onVoice, onVoiceGone, lineTexts, seconds, readOnly, onProject }: Props) {
  const [busy, setBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const rec = useRef<{ mr: MediaRecorder; stream: MediaStream } | null>(null)
  const off = readOnly || busy || recording
  const full = project.voiceover.length >= MAX_VOICE

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

  // A new voice goes on the timeline at the playhead. The newest project is read here: the upload took a while.
  const adopt = (info: VoiceInfo, source: Source) => {
    onVoice(info)
    const base = current() ?? project
    onProject(addVoice(base, { id: info.id, source, start: Math.round(seconds * 100) / 100, volume: 1, edits: {} }))
    setNotice(info.words === null ? t('editor.voice.noWords') : null)
  }

  const send = async (file: Blob, source: 'recording' | 'upload') => {
    setBusy(true)
    setError(null)
    try {
      adopt(await putVoice(ideaId, file, source), source)
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
    const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
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
    try {
      onProject(removeVoice(current() ?? project, id))
      if ((await flush()) !== 'saved') throw new Error(t('editor.err.save'))
      await deleteVoice(ideaId, id)
      onVoiceGone(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cv-ed-tool">
      <div className="cv-ed-tool-row">
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
      </div>
      <TtsSection ideaId={ideaId} lineTexts={lineTexts} disabled={off || full} onDone={(info) => adopt(info, 'tts')} onError={setError} />
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
  ideaId: string
  lineTexts: string[]
  disabled: boolean
  onDone: (info: VoiceInfo) => void
  onError: (message: string | null) => void
}

type Ask = { usd: number; remaining: number }

// An AI voice reads the text. It asks for the price first and spends only after the person confirms.
function TtsSection({ ideaId, lineTexts, disabled, onDone, onError }: TtsProps) {
  const [models, setModels] = useState<GenModel[] | null>(null)
  const [model, setModel] = useState('')
  const [initial] = useState(() => ttsDefaultText(lineTexts))
  const [text, setText] = useState(initial.text)
  const [ask, setAsk] = useState<Ask | null>(null)
  const [state, setState] = useState<'idle' | 'quoting' | 'working'>('idle')
  const abort = useRef<AbortController | null>(null)

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
      abort.current?.abort()
    }
  }, [])

  const fail = (e: unknown) => onError(e instanceof Error ? e.message : String(e))

  const quote = async () => {
    onError(null)
    if (!text.trim()) return onError(t('editor.tts.empty'))
    setState('quoting')
    try {
      setAsk(await quoteTts(ideaId, text, model))
    } catch (e) {
      fail(e)
    } finally {
      setState('idle')
    }
  }

  const confirm = async () => {
    onError(null)
    setAsk(null)
    setState('working')
    const ac = new AbortController()
    abort.current = ac
    try {
      const gen = await startTts(ideaId, text, model)
      const end = await pollGen(ideaId, gen.id, () => {}, { signal: ac.signal })
      if (!end) return
      if (end.status !== 'done') throw new Error(end.error || t('editor.tts.failed'))
      onDone(await importTts(ideaId, gen.id))
    } catch (e) {
      fail(e)
    } finally {
      abort.current = null
      setState('idle')
    }
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
            <div className="cv-ed-tool-row" role="group" aria-label={t('editor.tts.price', { usd: ask.usd.toFixed(2), left: ask.remaining.toFixed(2) })}>
              <strong className="small">{t('editor.tts.price', { usd: ask.usd.toFixed(2), left: ask.remaining.toFixed(2) })}</strong>
              <button type="button" className="btn btn-primary btn-sm" disabled={disabled} onClick={() => void confirm()}>{t('editor.tts.confirm')}</button>
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
