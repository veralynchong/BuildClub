import { t } from '../lib/i18n'
import { elapsedSeconds } from '../lib/searchStatus'
import { useElapsed } from '../lib/useElapsed'
import { PlayMarkLoader } from './PlayMarkLoader'

// Live searches run a real scrape per platform, which usually takes 20–60 seconds (cached repeats are instant).
// `title` names the platforms, or the step when a pasted link or screenshot is being read.
// Searches run in the background, so this is a card on the page, not a blocking overlay.
// `resolvedAt`: the results have arrived; the play mark plays its ~2s resolve (App then removes the card)
// and the seconds stop at the moment the results came in.
export function LiveLoading({ query, title, startedAt, resolvedAt = null }: { query: string; title?: string; startedAt: number; resolvedAt?: number | null }) {
  const ticking = useElapsed(startedAt)
  const seconds = resolvedAt != null ? elapsedSeconds(startedAt, resolvedAt) : ticking

  return (
    <div className={`search-inline${resolvedAt != null ? ' is-resolving' : ''}`} role="status" aria-live="polite">
      <div className="reading reading-live reading-inline">
        {/* The play mark fills as the search runs: the results that are on their way. */}
        <PlayMarkLoader startedAt={startedAt} resolvedAt={resolvedAt} />
        <strong>{title ?? t('find.loading.title', { query })}</strong>
        <ol className="reading-steps">
          <li className={seconds < 3 ? 'now' : 'done'}>
            <span className="reading-dot" aria-hidden="true">{seconds < 3 ? '' : '✓'}</span>
            {t('find.loading.sending')}
          </li>
          <li className={seconds < 3 ? '' : 'now'}>
            <span className="reading-dot" aria-hidden="true" />
            {t('find.loading.collecting')}
          </li>
        </ol>
        <span className="small muted">
          {t('find.loading.footer', { seconds })}
        </span>
        <span className="small muted">{t('find.bg.inline')}</span>
      </div>
    </div>
  )
}
