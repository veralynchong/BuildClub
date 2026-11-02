import { useEffect, useRef, useState } from 'react'
import { hookLabelKey, checkLinks, checkMessage, lastCompare, mergeLinks, parseLinks, pollCompare, rememberCompare, startCompare, MAX_VIDEOS, MIN_VIDEOS } from '../lib/compare'
import type { CompareDone, CompareProgress, CompareResult, CompareVideo } from '../lib/compare'
import { t, tp } from '../lib/i18n'
import type { Key } from '../lib/i18n'

export interface PickVideo {
  url: string
  label: string
  thumbnail?: string
}

interface Props {
  shortlist: PickVideo[]
  results: PickVideo[]
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

const shortUrl = (url: string) => (url.length > 56 ? `${url.slice(0, 53)}…` : url)

function Picker({ title, videos, picked, toggle, disabled }: { title: string; videos: PickVideo[]; picked: string[]; toggle: (url: string) => void; disabled: boolean }) {
  if (videos.length === 0) return null
  return (
    <fieldset className="cmp-pick-group" disabled={disabled}>
      <legend className="field-label">{title}</legend>
      <div className="cmp-picks">
        {videos.map((v) => (
          <label key={v.url} className={`cmp-pick ${picked.includes(v.url) ? 'cmp-pick-on' : ''}`}>
            <input type="checkbox" className="sr-only" checked={picked.includes(v.url)} onChange={() => toggle(v.url)} />
            <span className={`thumb cmp-thumb ${v.thumbnail ? 'thumb-img' : ''}`} aria-hidden="true">
              {v.thumbnail && <img src={v.thumbnail} alt="" loading="lazy" />}
            </span>
            <span className="cmp-pick-text">{v.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function Progress({ p, n }: { p: CompareProgress; n: number }) {
  return (
    <div className="cmp-progress" role="status" aria-live="polite">
      <h2 className="sub-head">{t('compare.progress.title', { n })}</h2>
      <ol>
        {p.videos.map((v) => (
          <li key={v.url} className={`cmp-vstate-${v.status}`}>
            <span className="cmp-vname">{shortUrl(v.url)}</span>
            <span className="small muted">
              {v.status === 'running' && v.step ? v.step : t(`compare.video.${v.status}` as Key)}
            </span>
            <div className="bar" aria-hidden="true">
              <span style={{ width: `${Math.round((v.status === 'done' ? 1 : v.progress) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ol>
      <div className="bar" aria-hidden="true">
        <span style={{ width: `${Math.round(p.progress * 100)}%` }} />
      </div>
      <p className="small muted">
        {p.status === 'queued' ? t('compare.progress.queued') : ''}
        {p.step} · {t('compare.progress.takes')}
      </p>
    </div>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="cmp-bullets">
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  )
}

function Result({ done, onReset }: { done: CompareDone; onReset: () => void }) {
  const r: CompareResult = done.result
  const used = done.videos.filter((v) => v.status === 'done')
  const skipped = done.videos.length - used.length
  return (
    <div className="cmp-result">
      <p className="chan-summary">
        <strong>{t('compare.result.basis', { n: used.length })}</strong>
        {skipped > 0 && <> · {t('compare.result.skipped', { n: skipped })}</>}
      </p>

      <section className="cmp-card cmp-lead">
        <h2 className="sub-head">{t('compare.format')}</h2>
        <p className="cmp-big">{r.commonFormat}</p>
        <dl className="cmp-facts">
          <div>
            <dt>{t('compare.length')}</dt>
            <dd>{r.typicalLength}</dd>
          </div>
          <div>
            <dt>{t('compare.emotion')}</dt>
            <dd>{r.emotionPattern}</dd>
          </div>
        </dl>
      </section>

      <section className="cmp-card">
        <h2 className="sub-head">{t('compare.structure')}</h2>
        <ol className="cmp-beats">
          {r.structure.map((b, i) => (
            <li key={`${i}-${b.beat}`}>
              <span className="step-mark" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <strong>{b.beat}</strong> <span className="pill">{b.timing}</span>
                <p className="small">{b.what}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="cmp-card">
        <h2 className="sub-head">{t('compare.hook')}</h2>
        <p>{r.hookPattern.pattern}</p>
        {r.hookPattern.hookTypes.length > 0 && (
          <div className="cmp-chips">
            {r.hookPattern.hookTypes.map((h) => (
              <span key={h} className="pill">
                {t(hookLabelKey(h))}
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="cmp-two">
        <section className="cmp-card">
          <h2 className="sub-head">{t('compare.copy')}</h2>
          <Bullets items={r.whatToCopy} />
        </section>
        {r.whatDiffers.length > 0 && (
          <section className="cmp-card">
            <h2 className="sub-head">{t('compare.differs')}</h2>
            <Bullets items={r.whatDiffers} />
          </section>
        )}
      </div>

      <section className="cmp-card cmp-confidence">
        <h2 className="sub-head">{t('compare.confidence')}</h2>
        <p>{r.confidence}</p>
      </section>

      <section className="cmp-card">
        <h2 className="sub-head">{t('compare.videos')}</h2>
        <ul className="cmp-videos">
          {used.map((v: CompareVideo) => (
            <li key={v.url}>
              <a href={v.url} target="_blank" rel="noreferrer" aria-label={`${t('compare.open')}: ${hostOf(v.url)}`}>
                {v.concept ?? shortUrl(v.url)}
              </a>
              {v.lengthSec ? <span className="small muted"> · {t('compare.secs', { n: Math.round(v.lengthSec) })}</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <button className="btn btn-ghost" onClick={onReset}>
        {t('compare.again')}
      </button>
    </div>
  )
}

export function CompareScreen({ shortlist, results }: Props) {
  const [text, setText] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [progress, setProgress] = useState<CompareProgress | null>(null)
  const [count, setCount] = useState(0)
  const [done, setDone] = useState<CompareDone | null>(null)
  const [error, setError] = useState('')
  const running = useRef<AbortController | null>(null)

  const urls = mergeLinks(parseLinks(text), picked)
  const busy = progress !== null
  const check = checkLinks(urls)
  // "Too few" is just the form being unfinished; a bad link or too many is worth saying.
  const hint = !check.ok && check.reason !== 'few' ? checkMessage(check) : ''

  const track = (job: Promise<string> | string, n: number) => {
    running.current?.abort()
    const control = new AbortController()
    running.current = control
    setError('')
    setDone(null)
    setCount(n)
    setProgress({ status: 'queued', step: '', progress: 0, videos: [] })
    Promise.resolve(job)
      .then((id) => pollCompare(id, setProgress, control.signal))
      .then(setDone)
      .catch((e: Error) => e.name !== 'AbortError' && setError(e.message))
      .finally(() => !control.signal.aborted && setProgress(null))
  }

  const start = () => {
    if (!check.ok) return
    const control = new AbortController()
    const job = startCompare(check.urls, control.signal).then((id) => {
      rememberCompare(id, check.urls)
      return id
    })
    track(job, check.urls.length)
  }

  // A refresh brings back the last comparison: the server kept its result.
  useEffect(() => {
    const last = lastCompare()
    if (last) {
      setText(last.urls.join('\n'))
      track(last.job, last.urls.length)
    }
    return () => running.current?.abort()
  }, [])

  const toggle = (url: string) => setPicked((p) => (p.includes(url) ? p.filter((u) => u !== url) : [...p, url]))
  const reset = () => {
    setDone(null)
    setError('')
    setText('')
    setPicked([])
  }
  const hasPicks = shortlist.length > 0 || results.length > 0

  return (
    <section className="channel compare">
      <header className="page-head">
        <span className="eyebrow">{t('compare.eyebrow')}</span>
        <h1>{t('compare.title')}</h1>
        <p className="muted">{t('compare.intro')}</p>
      </header>

      <form
        className="chan-form"
        onSubmit={(e) => {
          e.preventDefault()
          start()
        }}
      >
        <label className="field">
          <span className="field-label">{t('compare.links')}</span>
          <textarea
            id="compare-links"
            rows={4}
            value={text}
            placeholder={t('compare.placeholder')}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
            aria-describedby="compare-links-hint"
          />
          <span id="compare-links-hint" className="small muted">
            {t('compare.linksHint')}
          </span>
        </label>

        <div className="cmp-pickers">
          <span className="field-label">{t('compare.pick')}</span>
          {hasPicks ? (
            <>
              <Picker title={t('compare.pickShortlist')} videos={shortlist} picked={picked} toggle={toggle} disabled={busy} />
              <Picker title={t('compare.pickResults')} videos={results} picked={picked} toggle={toggle} disabled={busy} />
            </>
          ) : (
            <p className="small muted">{t('compare.pickNone')}</p>
          )}
        </div>

        <div className="chan-row">
          <button className="btn btn-primary" type="submit" disabled={busy || !check.ok}>
            {t('compare.start')}
          </button>
          <span className="small muted" aria-live="polite">
            {tp('compare.count', urls.length)} · {t('compare.countRule', { min: MIN_VIDEOS, max: MAX_VIDEOS })}
          </span>
        </div>
        {hint && !busy && (
          <p className="small cmp-hint" role="status">
            {hint}
          </p>
        )}
        <p className="small muted chan-quota">{t('compare.cost')}</p>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {progress && <Progress p={progress} n={count} />}
      {done && <Result done={done} onReset={reset} />}
      {!done && !progress && !error && (
        <div className="empty">
          <p>{t('compare.empty')}</p>
        </div>
      )}
    </section>
  )
}
