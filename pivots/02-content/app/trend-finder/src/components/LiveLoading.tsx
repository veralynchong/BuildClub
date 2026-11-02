import { t } from '../lib/i18n'
import { useElapsed } from '../lib/useElapsed'

// Live searches run a real scrape per platform, which usually takes 20–60 seconds (cached repeats are instant).
// `title` names the platforms, or the step when a pasted link or screenshot is being read.
// Searches run in the background, so this is a card on the page, not a blocking overlay.
export function LiveLoading({ query, title, startedAt }: { query: string; title?: string; startedAt: number }) {
  const seconds = useElapsed(startedAt)

  return (
    <div className="search-inline" role="status" aria-live="polite">
      <div className="reading reading-live reading-inline">
        {/* Shimmer placeholders: the shape of the results that are on their way. */}
        <div className="skeleton-grid" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-tile">
              <span className="skeleton skeleton-thumb" />
              <span className="skeleton skeleton-line" />
              <span className="skeleton skeleton-line skeleton-line-short" />
            </div>
          ))}
        </div>
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
