import { useEffect, useId, useRef, useState } from 'react'
import { t } from '../../lib/i18n'
import { imageEstimate, normalizeImageSettings, priceLabel } from '../../lib/canvas/graph'
import { aboutTime } from '../../lib/canvas/shell'
import { ff, usd } from '../../lib/strings/freeform'
import type { GenModel, NodeData } from '../../lib/canvas/types'

interface Props {
  models: GenModel[]
  kind: 'image' | 'video'
  value: string | undefined
  imageSettings?: NodeData
  seconds: number | undefined
  refuses: (m: GenModel) => string | null
  disabled: boolean
  onPick: (id: string) => void
}

const TIERS = ['cheap', 'balanced', 'best'] as const
const tierOf = (m: GenModel) => TIERS.find((x) => x === m.tier)

// One run of the model at the node's length (or the model's first length when it can't do that one).
const priceText = (m: GenModel, seconds: number | undefined): string => priceLabel(m, m.durations?.includes(seconds ?? -1) ? seconds : undefined)

const waitText = (m: GenModel): string | null => {
  if (m.typicalSeconds == null) return null
  const a = aboutTime(m.typicalSeconds)
  return t('canvas.panel.wait', { eta: t(a.key, { n: a.n }) })
}

// The model menu of the right panel (spec §6.3): a button that opens a list box. Each row has the full name, the price,
// the usual wait and a tier badge; a model without a key, or one that can't take a connected input, is shown but can't
// be picked, with the reason. Keyboard: arrows move, Enter picks, Esc closes.
export function ModelPicker({ models, kind, value, seconds, imageSettings, refuses, disabled, onPick }: Props) {
  const price = (m: GenModel) => m.kind === 'image' && imageSettings ? usd(imageEstimate(m, normalizeImageSettings(imageSettings, m))) : priceText(m, seconds)
  const [open, setOpen] = useState(false)
  const options = models.filter((m) => m.kind === kind)
  const why = (m: GenModel): string | null => (!m.available ? ff('needsKey') : refuses(m))
  const current = options.find((m) => m.id === value)
  const [active, setActive] = useState(-1)
  const listId = useId()
  const button = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (open) list.current?.focus()
  }, [open])
  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  const show = () => {
    const at = options.findIndex((m) => m.id === value)
    setActive(at >= 0 ? at : options.findIndex((m) => why(m) === null))
    setOpen(true)
  }
  const close = () => {
    setOpen(false)
    button.current?.focus()
  }
  const pick = (m: GenModel | undefined) => {
    if (!m || why(m) !== null) return
    if (m.id !== value) onPick(m.id)
    close()
  }
  // The next row that can be picked in the direction, staying put at the ends.
  const step = (dir: 1 | -1) => {
    for (let i = active + dir; i >= 0 && i < options.length; i += dir) {
      if (why(options[i]) === null) return setActive(i)
    }
  }

  return (
    <div className="cv-picker">
      <button
        ref={button}
        type="button"
        className="cv-picker-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={t('canvas.gen.model')}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault()
            show()
          }
        }}
      >
        <span className="cv-picker-name">{current ? current.label : t('canvas.gen.retiredOption')}</span>
        {current && <span className="cv-picker-meta small muted">{price(current)}</span>}
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul
          ref={list}
          id={listId}
          className="cv-model-list"
          role="listbox"
          tabIndex={-1}
          aria-label={t('canvas.gen.model')}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null) && e.relatedTarget !== button.current) setOpen(false)
          }}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              step(e.key === 'ArrowDown' ? 1 : -1)
            } else if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              pick(options[active])
            } else if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              close()
            } else if (e.key === 'Tab') {
              setOpen(false)
            }
          }}
        >
          {options.map((m, i) => {
            const reason = why(m)
            const tier = tierOf(m)
            const wait = waitText(m)
            return (
              <li
                key={m.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={m.id === value}
                aria-disabled={reason !== null}
                className={`cv-model-row${i === active ? ' is-active' : ''}`}
                onMouseEnter={() => reason === null && setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { e.preventDefault(); pick(m) }}
              >
                <span className="cv-model-row-name">{m.label}</span>
                {tier && <span className={`cv-tier is-${tier}`}>{t(`canvas.tier.${tier}`)}</span>}
                <span className="cv-model-row-meta small muted">
                  {price(m)}
                  {wait && ` · ${wait}`}
                  {m.kind === 'image' && ` · ${(m.aspects ?? []).join(' / ')} · ${m.resolutions?.join(' / ') || ff('modelDefault')} · ×${m.maxCount ?? 1}`}
                </span>
                {reason && <span className="cv-model-row-why small">{reason}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
