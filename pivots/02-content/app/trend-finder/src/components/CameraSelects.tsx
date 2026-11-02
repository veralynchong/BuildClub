import type { Shot } from '../types'
import { ANGLES, FRAMINGS, MOVEMENTS, angleLabel, framingLabel, movementLabel } from '../lib/shots'
import { t } from '../lib/i18n'

interface Props {
  shot: Shot
  n: number
  onChange: (patch: Partial<Shot>) => void
}

// Framing, angle and movement as three selects, plus the filming tip, for one shot of an editable plan.
export function CameraSelects({ shot, n, onChange }: Props) {
  const pick = <K extends 'framing' | 'angle' | 'movement'>(field: K, value: string) =>
    onChange({ [field]: value || undefined } as Partial<Shot>)
  const select = (field: 'framing' | 'angle' | 'movement', values: string[], label: (v: never) => string) => (
    <label className="cam-select">
      <span className="cam-select-label">{t(`shots.field.${field}`)}</span>
      <select id={`shot-${field}-${n}`} value={shot[field] ?? ''} onChange={(e) => pick(field, e.target.value)}>
        <option value="">{t('shots.cam.unset')}</option>
        {values.map((v) => (
          <option key={v} value={v}>
            {label(v as never)}
          </option>
        ))}
      </select>
    </label>
  )
  return (
    <div className="cam-edit" role="group" aria-label={t('shots.cam.group', { n })}>
      {select('framing', FRAMINGS, framingLabel)}
      {select('angle', ANGLES, angleLabel)}
      {select('movement', MOVEMENTS, movementLabel)}
      <input
        id={`shot-tip-${n}`}
        className="cam-tip-input"
        aria-label={t('shots.tip.label')}
        value={shot.tip ?? ''}
        maxLength={300}
        placeholder={t('shots.tip.placeholder')}
        onChange={(e) => onChange({ tip: e.target.value || undefined })}
      />
    </div>
  )
}
