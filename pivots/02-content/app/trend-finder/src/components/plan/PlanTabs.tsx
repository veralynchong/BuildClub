import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { PLAN_TABS, panelId, tabId } from '../../lib/planTabs.ts'
import type { PlanTab } from '../../lib/planTabs.ts'
import { t } from '../../lib/i18n'

interface Props {
  tab: PlanTab
  // The tab of the plan's current step, marked with a dot.
  current: PlanTab
  onTab: (tab: PlanTab) => void
  // True for a tab that is not open yet; it still opens and says why.
  locked: (tab: PlanTab) => boolean
  // Prefix of the tab and panel ids, one per plan.
  idBase: string
}

export function PlanTabs({ tab, current, onTab, locked, idBase }: Props) {
  const refs = useRef<Partial<Record<PlanTab, HTMLButtonElement | null>>>({})
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? PLAN_TABS.length - 1 : step ? (i + step + PLAN_TABS.length) % PLAN_TABS.length : -1
    if (to < 0) return
    e.preventDefault()
    const next = PLAN_TABS[to]
    onTab(next)
    refs.current[next]?.focus()
  }
  return (
    <div className="pt-tabs" role="tablist" aria-label={t('plan.tab.label')}>
      {PLAN_TABS.map((x, i) => (
        <button
          key={x}
          ref={(el) => {
            refs.current[x] = el
          }}
          type="button"
          role="tab"
          id={tabId(idBase, x)}
          className="pt-tab"
          aria-selected={tab === x}
          aria-controls={panelId(idBase, x)}
          aria-disabled={locked(x) || undefined}
          data-current={current === x || undefined}
          tabIndex={tab === x ? 0 : -1}
          onClick={() => onTab(x)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {t(`plan.tab.${x}`)}
        </button>
      ))}
    </div>
  )
}
