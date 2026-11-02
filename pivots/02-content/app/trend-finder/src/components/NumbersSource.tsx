import { useEffect, useState } from 'react'
import type { Video } from '../types'
import { t } from '../lib/i18n'
import { platformName } from '../lib/metrics'
import { SOURCE_KEY, agoWhen, canRecheck, countText, fetchedWhen, recheckRows, rescored, scoreFormula, stampOf, type Recheck } from '../lib/numbers'
import { cachedRecheck, loadRecheck, runRecheck } from '../lib/recheckApi'

// "Where these numbers come from": the source, when it was fetched, the original post, how the score is worked
// out, and a free re-check of one video's counts. Live results only; the built-in samples have no source to show.
export function NumbersSource({ video, open }: { video: Video; open?: boolean }) {
  const [shown, setShown] = useState(Boolean(open))
  const [result, setResult] = useState<Recheck | null>(() => cachedRecheck(video) ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const key = `${video.platform}:${video.id}`

  // Looked up once the section is open, so a results page full of cards makes no extra requests.
  useEffect(() => {
    if (!shown || !canRecheck(video) || cachedRecheck(video) !== undefined) return
    let live = true
    loadRecheck(video).then((r) => live && setResult(r))
    return () => {
      live = false
    }
  }, [shown, key]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!video.live) return null
  const now = Date.now()
  const fetched = fetchedWhen(video.fetchedAt, now)
  const name = platformName[video.platform]

  const check = async () => {
    setBusy(true)
    setError('')
    try {
      setResult(await runRecheck(video))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('find.numbers.failedGeneric'))
    } finally {
      setBusy(false)
    }
  }
  const newScore = result && rescored(video, result)

  return (
    <details className="numsrc" open={shown} onToggle={(e) => setShown(e.currentTarget.open)}>
      <summary>{t('find.numbers.summary')}</summary>
      <dl className="numsrc-list">
        <div>
          <dt>{t('find.numbers.source')}</dt>
          <dd>{t(SOURCE_KEY[video.platform])}</dd>
        </div>
        <div>
          <dt>{t('find.numbers.fetched')}</dt>
          <dd>{fetched ?? t('find.numbers.fetchedUnknown')}</dd>
        </div>
        {video.url && (
          <div>
            <dt>{t('find.numbers.original')}</dt>
            <dd>
              <a href={video.url} target="_blank" rel="noreferrer">
                {t('find.numbers.openOriginal', { platform: name })}
              </a>
            </dd>
          </div>
        )}
        <div>
          <dt>{t('find.numbers.score')}</dt>
          <dd className="numsrc-formula">{scoreFormula(video)}</dd>
        </div>
      </dl>
      {canRecheck(video) ? (
        <div className="numsrc-check">
          <button type="button" className="btn btn-ghost btn-sm" onClick={check} disabled={busy}>
            {busy ? t('find.numbers.rechecking') : result ? t('find.numbers.recheckAgain') : t('find.numbers.recheck')}
          </button>
          <span className="small muted">{video.platform === 'instagram' ? t('find.numbers.igHint') : t('find.numbers.recheckHint')}</span>
          {error && (
            <p className="numsrc-error" role="alert">
              {error}
            </p>
          )}
          {result && (
            <div className="numsrc-result">
              <p className="small muted">{t('find.numbers.col.old')} → {t('find.numbers.col.new')}</p>
              <dl className="numsrc-rows" aria-label={`${t('find.numbers.col.old')} → ${t('find.numbers.col.new')}`}>
                {recheckRows(result).map((row) => (
                  <div key={row.key} className={row.changed ? 'is-changed' : undefined}>
                    <dt>{t(`find.numbers.row.${row.key}`)}</dt>
                    <dd>
                      {countText(row.old)} → <strong>{countText(row.now)}</strong>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="small muted">{t('find.numbers.checked', { when: agoWhen(result.checkedAt, now), at: stampOf(result.checkedAt) })}</p>
              {newScore && <p className="small">{t('find.numbers.newScore', { score: newScore })}</p>}
              {result.followersKept && <p className="small muted">{t('find.numbers.followersKept')}</p>}
            </div>
          )}
        </div>
      ) : (
        video.platform === 'reddit' && <p className="small muted">{t('find.numbers.noRedditRecheck')}</p>
      )}
    </details>
  )
}
