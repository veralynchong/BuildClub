import { useEffect, useId, useRef, useState } from 'react'
import { t } from '../../lib/i18n'
import type { Key } from '../../lib/i18n'
import type { Sort } from '../../state'
import type { Video } from '../../types'
import { CONTENT_TYPES } from '../../types'
import { contentTypeLabel } from './words'
import {
  DEFAULT_FILTERS, FOLLOWERS_OPTIONS, LENGTH_OPTIONS, VIEWS_OPTIONS, WITHIN_OPTIONS,
  activeFilters, clearFilter, relaxHint, toggleType, typeCounts, RELAXED_VIEWS,
  type ActiveFilter, type ResultFilters,
} from '../../lib/resultFilters'

const VIEWS_KEY: Record<number, Key> = { 0: 'find.filter.any', 100_000: 'find.filter.v100k', 500_000: 'find.filter.v500k', 1_000_000: 'find.filter.v1m', 5_000_000: 'find.filter.v5m' }
const FOLLOWERS_KEY: Record<number, Key> = { 0: 'find.filter.any', 5_000: 'find.filter.f5k', 50_000: 'find.filter.f50k', 1_000_000: 'find.filter.f1m' }
const WITHIN_KEY: Record<number, Key> = { 0: 'find.filter.any', 7: 'find.filter.week', 30: 'find.filter.month', 90: 'find.filter.months3', 365: 'find.filter.year' }
const LENGTH_KEY: Record<string, Key> = { any: 'find.filter.any', short: 'find.filter.short', mid: 'find.filter.mid', long: 'find.filter.long' }
const SORTS: { value: Sort; key: Key }[] = [
  { value: 'outlier', key: 'find.filter.sortOutlier' },
  { value: 'views', key: 'find.filter.sortViews' },
  { value: 'newest', key: 'find.filter.sortNewest' },
]

function chipLabel(which: ActiveFilter, f: ResultFilters): string {
  switch (which) {
    case 'views': return t('find.filter.chipViews', { v: t(VIEWS_KEY[f.viewsMin]) })
    case 'followers': return t('find.filter.chipFollowers', { f: t(FOLLOWERS_KEY[f.followersMax]) })
    case 'smallBig': return t('find.filter.chipSmallBig')
    case 'brokeOut': return t('find.filter.chipBrokeOut')
    case 'within': return t(WITHIN_KEY[f.within])
    case 'length': return t(LENGTH_KEY[f.length])
    case 'types': return t('find.filter.chipTypes', { types: f.types.map(contentTypeLabel).join(', ') })
  }
}

function Radios<T extends string | number>({ name, legend, options, labelOf, value, onChange }: {
  name: string
  legend: string
  options: T[]
  labelOf: (o: T) => string
  value: T
  onChange: (o: T) => void
}) {
  return (
    <fieldset className="fp-group">
      <legend>{legend}</legend>
      <div className="fp-options">
        {options.map((o) => (
          <label key={o} className={`fp-opt ${o === value ? 'fp-opt-on' : ''}`}>
            <input type="radio" name={name} checked={o === value} onChange={() => onChange(o)} />
            {labelOf(o)}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

interface Props {
  filters: ResultFilters
  setFilters: (f: ResultFilters) => void
  sort: Sort
  setSort: (s: Sort) => void
  // The results before these filters, to count how many videos each content type has.
  videos: Video[]
}

// The YouTube-style "Filters" button and its panel. The chips and the too-few hint are separate (FilterChips).
export function FilterButtonPanel({ filters, setFilters, sort, setSort, videos }: Props) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const wrap = useRef<HTMLDivElement>(null)
  // Closes on a click outside or Escape, so the panel never covers the chips and hint below it for long.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  const n = activeFilters(filters).length
  const counts = typeCounts(videos, filters)
  // Only types that have videos (plus any already picked, so it can be unpicked). The group is left out when nothing was sorted.
  const typeOptions = CONTENT_TYPES.filter((c) => counts[c] || filters.types.includes(c))
  const set = (patch: Partial<ResultFilters>) => setFilters({ ...filters, ...patch })
  return (
    <div className="fp" ref={wrap}>
      <button type="button" className="btn btn-ghost btn-sm fp-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        {n > 0 ? t('find.filter.buttonCount', { n }) : t('find.filter.button')}
      </button>
      {open && (
        <div className="fp-panel" id={id} role="group" aria-label={t('find.filter.title')}>
          <Radios name={`${id}-views`} legend={t('find.filter.views')} options={VIEWS_OPTIONS} labelOf={(o) => t(VIEWS_KEY[o])} value={filters.viewsMin} onChange={(viewsMin) => set({ viewsMin })} />
          <Radios name={`${id}-followers`} legend={t('find.filter.followers')} options={FOLLOWERS_OPTIONS} labelOf={(o) => t(FOLLOWERS_KEY[o])} value={filters.followersMax} onChange={(followersMax) => set({ followersMax })} />
          <fieldset className="fp-group">
            <legend>{t('find.filter.viral')}</legend>
            <div className="fp-options">
              <label className={`fp-opt ${filters.smallBig ? 'fp-opt-on' : ''}`}>
                <input type="checkbox" checked={filters.smallBig} onChange={(e) => set({ smallBig: e.target.checked })} />
                {t('find.filter.smallBig')}
              </label>
              <label className={`fp-opt ${filters.brokeOut ? 'fp-opt-on' : ''}`}>
                <input type="checkbox" checked={filters.brokeOut} onChange={(e) => set({ brokeOut: e.target.checked })} />
                {t('find.filter.brokeOut')}
              </label>
            </div>
          </fieldset>
          <Radios name={`${id}-within`} legend={t('find.filter.upload')} options={WITHIN_OPTIONS} labelOf={(o) => t(WITHIN_KEY[o])} value={filters.within} onChange={(within) => set({ within })} />
          <Radios name={`${id}-length`} legend={t('find.filter.length')} options={LENGTH_OPTIONS} labelOf={(o) => t(LENGTH_KEY[o])} value={filters.length} onChange={(length) => set({ length })} />
          {typeOptions.length > 0 && (
            <fieldset className="fp-group">
              <legend>{t('find.filter.types')}</legend>
              <div className="fp-options">
                {typeOptions.map((c) => (
                  <label key={c} className={`fp-opt ${filters.types.includes(c) ? 'fp-opt-on' : ''}`}>
                    <input type="checkbox" checked={filters.types.includes(c)} onChange={() => setFilters(toggleType(filters, c))} />
                    {t('find.filter.typeOption', { label: contentTypeLabel(c), n: counts[c] ?? 0 })}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <Radios name={`${id}-sort`} legend={t('find.filter.sort')} options={SORTS.map((s) => s.value)} labelOf={(o) => t(SORTS.find((s) => s.value === o)!.key)} value={sort} onChange={setSort} />
          <button type="button" className="link-btn" onClick={() => setFilters(DEFAULT_FILTERS)}>
            {t('find.filter.reset')}
          </button>
        </div>
      )}
    </div>
  )
}

// Removable chips for the filters that are on, plus the one-click hint when too few videos are left.
export function FilterChips({ filters, setFilters, kept }: { filters: ResultFilters; setFilters: (f: ResultFilters) => void; kept: number }) {
  const active = activeFilters(filters)
  const hint = relaxHint(kept, filters)
  if (active.length === 0) return null
  return (
    <div className="fp-chips">
      <div className="fp-chip-row">
        {active.map((which) => {
          const label = chipLabel(which, filters)
          return (
            <span key={which} className="q-chip">
              {label}
              <button type="button" className="q-chip-x" aria-label={t('find.filter.removeChip', { label })} onClick={() => setFilters(clearFilter(filters, which))}>
                ✕
              </button>
            </span>
          )
        })}
      </div>
      {hint && (
        <p className="fp-hint" role="status">
          <span>{t('find.filter.fewTitle', { n: kept })}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFilters(hint.kind === 'views' ? { ...filters, viewsMin: RELAXED_VIEWS } : DEFAULT_FILTERS_CLEARED)}>
            {hint.kind === 'views' ? t('find.filter.relaxViews') : t('find.filter.relaxClear')}
          </button>
        </p>
      )}
    </div>
  )
}

const DEFAULT_FILTERS_CLEARED: ResultFilters = { ...DEFAULT_FILTERS, viewsMin: 0 }
