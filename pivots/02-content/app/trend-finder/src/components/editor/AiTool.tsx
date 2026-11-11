import { useEffect, useRef, useState } from 'react'
import type { Shot } from '../../types'
import type { Generation } from '../../lib/canvas/types'
import type { Take } from '../../lib/takes'
import { t } from '../../lib/i18n'
import { sourceKey, clipLength } from '../../lib/editor/timeline'
import type { Clip, EditProject } from '../../lib/editor/types'
import {
  getClipSuggestions, getKeeps, getTakeRanking, NotReady,
  type CleanupItem, type ClipSuggestions, type TakeRanking,
} from '../../lib/editor/aiApi'
import { MAX_CLIPS, nextClipId, PAD_DEFAULT, PAD_MAX, previewFrame, rankReason, replaceWithRanges, setClipRange, stamp, swapTake } from '../../lib/editor/aiEdit'
import { ErrorText } from '../ErrorText'
import { clipLabel } from './clipName'

interface Props {
  planId: string | null // the plan whose takes these are; null for a workspace
  project: EditProject
  clip: Clip | null // the selected timeline clip
  shots: Shot[]
  gens: Generation[]
  takes: Take[]
  durations: Record<string, number> // footage key to its length
  readOnly: boolean
  undo: { label: string } | null
  log: string[]
  onApply: (next: EditProject, label: string) => void
  onUndo: () => void
  onPreview: (frame: number) => void // seek the player there and play
}

const round1 = (n: number): string => (Math.round(n * 10) / 10).toFixed(1)

// The AI tab: for the selected clip, where the script line is, what could be cleaned up and which take is best. Everything
// is a proposal; each button changes the edit once and "Undo last AI change" puts it back.
export function AiTool(props: Props) {
  const { planId, clip, undo, log, onUndo, readOnly } = props
  let body
  if (!planId) body = <p className="muted small">{t('editor.ai.noPlan')}</p>
  else if (!clip) body = <p className="muted small">{t('editor.ai.noClip')}</p>
  else if (clip.source.kind !== 'take') body = <p className="muted small">{t('editor.ai.notTake')}</p>
  else body = <ClipAi key={clip.id} {...props} planId={planId} clip={clip} />
  return (
    <div className="cv-ed-tool cv-ed-ai">
      <p className="muted small">{t('editor.ai.intro')}</p>
      {undo && (
        <div className="cv-ed-ai-undo">
          <button type="button" className="btn btn-ghost btn-sm" disabled={readOnly} onClick={onUndo}>{t('editor.ai.undo')}</button>
          <span className="muted small">{t('editor.ai.undoNote', { label: undo.label })}</span>
        </div>
      )}
      {body}
      {log.length > 0 && (
        <section aria-label={t('editor.ai.log')}>
          <h4 className="cv-ed-sub">{t('editor.ai.log')}</h4>
          <ul className="cv-ed-ai-log small muted">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </section>
      )}
    </div>
  )
}

type Load = 'loading' | 'ready' | 'waiting' | 'failed' | 'error'

function ClipAi({ planId, project, clip, shots, gens, takes, durations, readOnly, onApply, onPreview }: Props & { planId: string; clip: Clip }) {
  const take = takes.find((x) => x.id === clip.source.id)
  const status = take?.analysis?.status
  const [pad, setPad] = useState(PAD_DEFAULT)
  const [padQ, setPadQ] = useState(PAD_DEFAULT) // the padding the alignment was last asked for (the slider is debounced)
  const [data, setData] = useState<ClipSuggestions | null>(null)
  const [load, setLoad] = useState<Load>('loading')
  const [err, setErr] = useState('')
  const [off, setOff] = useState<ReadonlySet<string>>(new Set()) // items the person unticked
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const latest = useRef(project)
  latest.current = project

  useEffect(() => {
    const id = setTimeout(() => setPadQ(pad), 300)
    return () => clearTimeout(id)
  }, [pad])

  useEffect(() => {
    let live = true
    getClipSuggestions(planId, clip.source.id, clip.in, clip.out, padQ).then(
      (v) => { if (live) { setData(v); setLoad('ready') } },
      (e: unknown) => {
        if (!live) return
        if (e instanceof NotReady) setLoad(e.status === 'failed' ? 'failed' : 'waiting')
        else { setLoad('error'); setErr(e instanceof Error ? e.message : String(e)) }
      },
    )
    return () => { live = false }
  }, [planId, clip.source.id, clip.in, clip.out, padQ, status])

  const name = clipLabel(clip.source, shots, gens, takes)
  const duration = durations[sourceKey(clip.source)] ?? clip.out
  const items = data?.cleanup ?? []
  const chosen = items.filter((i) => !off.has(i.id))
  const flip = (id: string) => setOff((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const apply = async () => {
    if (chosen.length === 0 || busy) return
    setBusy(true)
    setNote('')
    try {
      const keeps = await getKeeps(planId, clip.in, clip.out, chosen.map((i) => [i.start, i.end]), pad)
      const base = latest.current
      const next = replaceWithRanges(base, clip.id, keeps, nextClipId)
      if (next === base) setNote(t(base.clips.length - 1 + keeps.length > MAX_CLIPS ? 'editor.ai.clean.tooMany' : 'editor.ai.clean.nothingLeft'))
      else {
        const saved = clipLength(clip) - keeps.reduce((n, k) => n + k[1] - k[0], 0)
        onApply(next, t('editor.ai.clean.applied', { n: chosen.length, name, sec: round1(saved), pieces: keeps.length }))
      }
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const align = data?.alignment
  const trim = () => {
    if (!align || align.status !== 'ok' || align.in === null || align.out === null) return
    const next = setClipRange(latest.current, clip.id, align.in, align.out, duration)
    if (next === latest.current) setNote(t('editor.ai.align.already'))
    else onApply(next, t('editor.ai.align.trimmed', { from: stamp(align.in), to: stamp(align.out) }))
  }
  const aligned = align?.status === 'ok' && align.in !== null && align.out !== null && Math.abs(clip.in - align.in) < 0.04 && Math.abs(clip.out - align.out) < 0.04

  return (
    <>
      {load === 'loading' && !data && <p className="muted small" role="status">{t('editor.ai.loading')}</p>}
      {load === 'waiting' && <p className="muted small" role="status">{t('editor.ai.waiting')}</p>}
      {load === 'failed' && <ErrorText text={t('editor.ai.failed')} />}
      {load === 'error' && <ErrorText text={err || t('editor.ai.err')} />}
      {data && load !== 'waiting' && load !== 'failed' && (
        <>
          {data.speech === 'none' && <p className="muted small" role="status">{t('editor.ai.noSpeech')}</p>}
          {data.speech === 'unavailable' && <p className="muted small" role="status">{t('editor.ai.noWhisper')}</p>}

          <section className="cv-ed-ai-card" aria-label={t('editor.ai.align.title')}>
            <h4 className="cv-ed-sub">{t('editor.ai.align.title')}</h4>
            {align?.status === 'manual' || !align ? (
              <p className="muted small">{t('editor.ai.align.manual')}</p>
            ) : (
              <>
                {data.line && <p className="small cv-ed-ai-line">{t('editor.ai.align.line', { line: data.line })}</p>}
                {data.speech === 'ok' && (
                  <>
                    <p className="small" data-coverage={align.coverage}>{t('editor.ai.align.coverage', { pct: Math.round(align.coverage * 100), matched: align.matched, total: align.total })}</p>
                    {align.missing.length > 0 && <p className="small cv-ed-ai-missing">{t('editor.ai.align.missing', { words: align.missing.join(' · ') })}</p>}
                    {align.in !== null && align.out !== null ? (
                      <div className="cv-ed-tool-row">
                        <span className="small muted">{t('editor.ai.align.range', { from: stamp(align.in), to: stamp(align.out) })}</span>
                        <button type="button" className="btn btn-sm" disabled={readOnly || aligned} onClick={trim}>{t('editor.ai.align.trim')}</button>
                      </div>
                    ) : (
                      <p className="muted small">{t('editor.ai.align.none')}</p>
                    )}
                  </>
                )}
              </>
            )}
          </section>

          <section className="cv-ed-ai-card" aria-label={t('editor.ai.clean.title')}>
            <h4 className="cv-ed-sub">{t('editor.ai.clean.title')}</h4>
            {items.length === 0 ? (
              <p className="muted small">{t('editor.ai.clean.none')}</p>
            ) : (
              <>
                <ul className="cv-ed-ai-items">
                  {items.map((it) => (
                    <li key={it.id} data-type={it.type}>
                      <input type="checkbox" checked={!off.has(it.id)} disabled={readOnly} aria-label={t('editor.ai.clean.pick', { label: itemLabel(it) })} onChange={() => flip(it.id)} />
                      <span className="cv-ed-ai-time">{stamp(it.start)}–{stamp(it.end)}</span>
                      <span className="cv-ed-ai-label" title={reasonOf(it)}>{itemLabel(it)}</span>
                      <button type="button" className="btn btn-ghost btn-sm" aria-label={`${t('editor.ai.clean.play')}: ${itemLabel(it)}`} title={t('editor.ai.clean.play')}
                        onClick={() => { const f = previewFrame(project, clip.id, it.start); if (f !== null) onPreview(f) }}>▶</button>
                    </li>
                  ))}
                </ul>
                <label className="cv-ed-field" title={t('editor.ai.clean.paddingHelp')}>
                  <span>{t('editor.ai.clean.padding', { n: pad })}</span>
                  <input type="range" min={0} max={PAD_MAX} step={1} value={pad} disabled={readOnly} onChange={(e) => setPad(Number(e.target.value))} />
                </label>
                <div>
                  <button type="button" className="btn btn-primary btn-sm" disabled={readOnly || busy || chosen.length === 0} onClick={() => void apply()}>
                    {t('editor.ai.clean.apply', { n: chosen.length })}
                  </button>
                </div>
              </>
            )}
          </section>
        </>
      )}
      {note && <p className="muted small" role="status">{note}</p>}
      <Ranking planId={planId} clip={clip} project={project} shots={shots} gens={gens} takes={takes} durations={durations} readOnly={readOnly} onApply={onApply} />
    </>
  )
}

function itemLabel(it: CleanupItem): string {
  const sec = round1(it.end - it.start)
  if (it.type === 'silence') return t(it.where === 'start' ? 'editor.ai.clean.silence.start' : it.where === 'end' ? 'editor.ai.clean.silence.end' : 'editor.ai.clean.silence', { sec })
  const text = (it.text ?? '').length > 40 ? `${(it.text ?? '').slice(0, 40)}…` : (it.text ?? '')
  return t(it.type === 'filler' ? 'editor.ai.clean.filler' : 'editor.ai.clean.retake', { text })
}

const reasonOf = (it: CleanupItem): string => t(it.type === 'silence' ? 'editor.ai.clean.silenceWhy' : it.type === 'filler' ? 'editor.ai.clean.fillerWhy' : 'editor.ai.clean.retakeWhy')

// The top three takes of the clip's shot, best first. Choosing one swaps the clip's take and keeps its place.
function Ranking({ planId, clip, project, shots, gens, takes, durations, readOnly, onApply }: Pick<Props, 'project' | 'shots' | 'gens' | 'takes' | 'durations' | 'readOnly' | 'onApply'> & { planId: string; clip: Clip }) {
  const shotId = clip.source.shotId
  const mine = takes.filter((x) => x.shotId === shotId)
  const sig = mine.map((x) => `${x.id}:${x.analysis?.status ?? ''}`).join(',')
  const [rank, setRank] = useState<TakeRanking | null>(null)
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')
  useEffect(() => {
    if (!shotId || mine.length < 2) return
    let live = true
    getTakeRanking(planId, shotId).then(
      (v) => { if (live) { setRank(v); setErr('') } },
      (e: unknown) => { if (live) setErr(e instanceof Error ? e.message : String(e)) },
    )
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, shotId, sig])
  if (!shotId) return null
  const use = (id: string, duration: number | null, from: number | null, to: number | null) => {
    const len = durations[`take:${id}`] ?? duration
    if (len === null) return setNote(t('editor.ai.takes.cantSwap'))
    const next = swapTake(project, clip.id, { kind: 'take', id, shotId }, len, { in: from, out: to })
    if (next === project) return setNote(t('editor.ai.takes.cantSwap'))
    setNote('')
    onApply(next, t('editor.ai.takes.swapped', { name: clipLabel(clip.source, shots, gens, takes), take: clipLabel({ kind: 'take', id, shotId }, shots, gens, takes) }))
  }
  return (
    <section className="cv-ed-ai-card" aria-label={t('editor.ai.takes.title')}>
      <h4 className="cv-ed-sub">{t('editor.ai.takes.title')}</h4>
      {mine.length < 2 ? (
        <p className="muted small">{t('editor.ai.takes.single')}</p>
      ) : (
        <>
          {err && <ErrorText text={err} />}
          {rank && rank.pending.length > 0 && <p className="muted small" role="status">{t('editor.ai.takes.pending', { n: rank.pending.length })}</p>}
          {rank && rank.ranking.length > 0 && (
            <ol className="cv-ed-ai-rank">
              {rank.ranking.map((r, i) => {
                const current = r.takeId === clip.source.id
                return (
                  <li key={r.takeId} data-current={current ? '' : undefined}>
                    <b>{i + 1}.</b>
                    <span className="cv-ed-ai-rank-body">
                      <span>{clipLabel({ kind: 'take', id: r.takeId, shotId }, shots, gens, takes)} <span className="muted small">· {t('editor.ai.takes.score', { score: Math.round(r.score) })}</span></span>
                      <span className="small muted">{rankReason(r)}</span>
                    </span>
                    {current ? <span className="cv-badge small">{t('editor.ai.takes.current')}</span>
                      : <button type="button" className="btn btn-sm" disabled={readOnly} onClick={() => use(r.takeId, r.duration, r.in, r.out)}>{t('editor.ai.takes.use')}</button>}
                  </li>
                )
              })}
            </ol>
          )}
          <p className="muted small">{t('editor.ai.takes.note')}</p>
          {note && <p className="muted small" role="status">{note}</p>}
        </>
      )}
    </section>
  )
}
