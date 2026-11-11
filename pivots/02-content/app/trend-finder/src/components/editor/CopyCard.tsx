import { useState } from 'react'
import { t } from '../../lib/i18n'
import type { EditProject } from '../../lib/editor/types'
import { checkHook, rewriteCaptions, writePost, type AnswerSource, type CaptionRewrite, type HookCheck, type PostCopy, type TimedLine } from '../../lib/editor/aiApi'
import { applyRewrites } from '../../lib/editor/aiEdit'
import { PLATFORMS, exportSettings } from '../../lib/editor/presets'
import { ErrorText } from '../ErrorText'

interface Props {
  planId: string
  project: EditProject
  captionLines: TimedLine[] // what the video shows as captions now, from speech, voiceover or the shots' lines
  readOnly: boolean
  onApply: (next: EditProject, label: string) => void
}

const message = (e: unknown): string => (e instanceof Error ? e.message : String(e))

const By = ({ source }: { source: AnswerSource }) => (
  <span className="cv-badge small" data-source={source}>{t(source === 'ai' ? 'editor.copy.by.ai' : 'editor.copy.by.rules')}</span>
)

// The AI tab's "Copy" section: a hook check, shorter captions, and the post's title, caption and hashtags.
export function CopyCard(props: Props) {
  return (
    <section className="cv-ed-ai-card" aria-label={t('editor.copy.title')} data-testid="copy-card">
      <h4 className="cv-ed-sub">{t('editor.copy.title')}</h4>
      <p className="muted small">{t('editor.copy.help')}</p>
      <HookCheckBlock {...props} />
      <RewriteBlock {...props} />
      <PostBlock {...props} />
    </section>
  )
}

function HookCheckBlock({ planId, project, captionLines }: Props) {
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<HookCheck | null>(null)
  const [err, setErr] = useState('')
  const run = async () => {
    if (busy) return
    setBusy(true)
    setErr('')
    try {
      const texts = project.texts.map((x) => ({ id: x.id, start: x.start, end: x.end, text: x.text }))
      setRes(await checkHook(planId, captionLines, texts))
    } catch (e) {
      setErr(message(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="cv-ed-copy-block" aria-label={t('editor.copy.hook.title')} data-testid="hook-check">
      <h5 className="cv-ed-sub">{t('editor.copy.hook.title')}</h5>
      <div className="cv-ed-tool-row">
        <button type="button" className="btn btn-sm" disabled={busy || project.clips.length === 0} onClick={() => void run()}>
          {busy ? t('editor.copy.hook.working') : t('editor.copy.hook.run')}
        </button>
        {project.clips.length === 0 && <span className="muted small">{t('editor.copy.hook.noClips')}</span>}
      </div>
      {err && <ErrorText text={err} />}
      {res && (
        <div role="status">
          <p className="small"><b data-score={res.score}>{t('editor.copy.hook.score', { score: res.score })}</b> <By source={res.source} /></p>
          <p className="small">{res.verdict}</p>
          {res.fixes.length === 0 ? <p className="muted small">{t('editor.copy.hook.noFixes')}</p> : <ul className="cv-ed-copy-list small">{res.fixes.map((f, i) => <li key={i}>{f}</li>)}</ul>}
        </div>
      )}
    </div>
  )
}

function RewriteBlock({ planId, project, readOnly, onApply }: Props) {
  const speech = project.captions.source === 'speech' ? (project.captions.speech ?? []) : []
  const [busy, setBusy] = useState(false)
  const [items, setItems] = useState<CaptionRewrite[] | null>(null)
  const [source, setSource] = useState<AnswerSource>('rules')
  const [err, setErr] = useState('')
  const [accepted, setAccepted] = useState(0) // lines taken from the current suggestions
  const run = async () => {
    if (busy) return
    setBusy(true)
    setErr('')
    setAccepted(0)
    try {
      const r = await rewriteCaptions(planId, speech)
      setItems(r.items)
      setSource(r.source)
    } catch (e) {
      setErr(message(e))
    } finally {
      setBusy(false)
    }
  }
  const accept = (picks: CaptionRewrite[]) => {
    const next = applyRewrites(project, picks.map((x) => ({ id: x.id, after: x.after })))
    if (next !== project) {
      onApply(next, t('editor.copy.rw.applied', { n: picks.length }))
      setAccepted((n) => n + picks.length)
    }
    const gone = new Set(picks.map((x) => x.id))
    setItems((cur) => (cur ?? []).filter((x) => !gone.has(x.id)))
  }
  const skip = (id: string) => setItems((cur) => (cur ?? []).filter((x) => x.id !== id))
  return (
    <div className="cv-ed-copy-block" aria-label={t('editor.copy.rw.title')} data-testid="caption-rewrite">
      <h5 className="cv-ed-sub">{t('editor.copy.rw.title')}</h5>
      {speech.length === 0 ? (
        <p className="muted small">{t('editor.copy.rw.needSpeech')}</p>
      ) : (
        <div className="cv-ed-tool-row">
          <button type="button" className="btn btn-sm" disabled={busy || readOnly} onClick={() => void run()}>{busy ? t('editor.copy.rw.working') : t('editor.copy.rw.run')}</button>
          {items && items.length > 0 && <By source={source} />}
        </div>
      )}
      {err && <ErrorText text={err} />}
      {items && items.length === 0 && <p className="muted small" role="status">{accepted > 0 ? t('editor.copy.rw.applied', { n: accepted }) : t('editor.copy.rw.none')}</p>}
      {items && items.length > 0 && (
        <>
          <ul className="cv-ed-copy-diffs">
            {items.map((x) => (
              <li key={x.id}>
                <p className="small cv-ed-copy-before"><span className="muted">{t('editor.copy.rw.before')}</span> <del>{x.before}</del></p>
                <p className="small cv-ed-copy-after"><span className="muted">{t('editor.copy.rw.after')}</span> <ins>{x.after}</ins></p>
                <div className="cv-ed-tool-row">
                  <button type="button" className="btn btn-sm" disabled={readOnly} onClick={() => accept([x])}>{t('editor.copy.rw.accept')}</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => skip(x.id)}>{t('editor.copy.rw.skip')}</button>
                </div>
              </li>
            ))}
          </ul>
          <div><button type="button" className="btn btn-primary btn-sm" disabled={readOnly} onClick={() => accept(items)}>{t('editor.copy.rw.acceptAll', { n: items.length })}</button></div>
        </>
      )}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
      setTimeout(() => setState('idle'), 1500)
    } catch {
      setState('failed')
    }
  }
  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => void copy()}>{state === 'copied' ? t('editor.copy.post.copied') : t('editor.copy.post.copy')}</button>
      {state === 'failed' && <span className="muted small" role="status">{t('editor.copy.post.copyFailed')}</span>}
    </>
  )
}

function PostBlock({ planId, project }: Props) {
  const preset = exportSettings(project).preset
  const platform = PLATFORMS[preset].label
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<PostCopy | null>(null)
  const [err, setErr] = useState('')
  const run = async () => {
    if (busy) return
    setBusy(true)
    setErr('')
    try {
      setRes(await writePost(planId, preset))
    } catch (e) {
      setErr(message(e))
    } finally {
      setBusy(false)
    }
  }
  const shown = res && res.preset === preset ? res : null // the preset changed since: the old words were for another platform
  return (
    <div className="cv-ed-copy-block" aria-label={t('editor.copy.post.title')} data-testid="post-copy">
      <h5 className="cv-ed-sub">{t('editor.copy.post.title')}</h5>
      <p className="muted small">{t('editor.copy.post.for', { platform })}</p>
      <div className="cv-ed-tool-row">
        <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void run()}>{busy ? t('editor.copy.post.working') : t('editor.copy.post.run')}</button>
        {shown && <By source={shown.source} />}
      </div>
      {err && <ErrorText text={err} />}
      {shown && (
        <dl className="cv-ed-copy-post">
          <dt className="small muted">{t('editor.copy.post.titleLabel', { n: shown.title.length })}</dt>
          <dd><span data-testid="post-title">{shown.title}</span> <CopyButton text={shown.title} /></dd>
          <dt className="small muted">{t('editor.copy.post.captionLabel', { n: shown.caption.length })}</dt>
          <dd><span data-testid="post-caption">{shown.caption}</span> <CopyButton text={shown.caption} /></dd>
          <dt className="small muted">{t('editor.copy.post.tagsLabel')}</dt>
          <dd><span data-testid="post-tags">{shown.hashtags.join(' ')}</span> <CopyButton text={shown.hashtags.join(' ')} /></dd>
        </dl>
      )}
    </div>
  )
}
