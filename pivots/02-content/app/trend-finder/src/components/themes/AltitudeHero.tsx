import type { ReactNode } from 'react'
import { t } from '../../lib/i18n'

// Search-page opener. Since 15 Nov 2026 it is plain (find-hero-plain.css): a small eyebrow, the serif headline
// and the sentence centred on the white page, no navy panel. Static on purpose: the design system says nothing loops.
// `children` is the search box, floating under the headline.
export function AltitudeHero({ clientName, children }: { clientName: string; children?: ReactNode }) {
  return (
    <header className="alt-hero alt-plain">
      <div className="alt-hero-inner">
        <h1>{t('shell.hero.headingBefore')}<span className="find-trending-heading">{t('shell.hero.headingTrending')}</span>{t('shell.hero.headingAfter')}{clientName}</h1>
        <p className="alt-lede">{t('shell.hero.subtitleBefore')}{t('shell.hero.subtitleEm')}{t('shell.hero.subtitleAfter')}</p>
        {children && <div className="alt-search">{children}</div>}
      </div>
    </header>
  )
}
