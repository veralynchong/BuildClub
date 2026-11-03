import { useEffect, useRef, useState } from 'react'
import { t, type Key } from '../../../lib/i18n'
import { useApp } from '../../../lib/appContext'
import { deleteLogo, putBrand, putLogo } from '../../../lib/editor/api'
import type { EditProject, LogoCorner, LogoSize } from '../../../lib/editor/types'
import type { Brand, Client } from '../../../types'
import { ErrorText } from '../../ErrorText'

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const FALLBACK_COLOR = '#1d1d1f'
const SIZES: [LogoSize, Key][] = [['small', 'editor.brand.size.small'], ['medium', 'editor.brand.size.medium'], ['large', 'editor.brand.size.large']]
const CORNERS: [LogoCorner, Key][] = [
  ['top-left', 'editor.brand.corner.topLeft'],
  ['top-right', 'editor.brand.corner.topRight'],
  ['bottom-left', 'editor.brand.corner.bottomLeft'],
  ['bottom-right', 'editor.brand.corner.bottomRight'],
]

interface Props {
  client: Client | undefined
  project: EditProject
  readOnly: boolean
  onProject: (p: EditProject) => void
}

// Logo, colour and font belong to the client (so every plan of it shares them); "show the logo" belongs to this video.
export function BrandTool({ client, project, readOnly, onProject }: Props) {
  const { setClientBrand } = useApp()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<string | null>(null) // a colour being picked; saved when the picker closes
  const brand = client?.brand
  const colorRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)
  const projectRef = useRef(project) // the latest project, read after an upload finishes
  projectRef.current = project
  const off = readOnly || busy || !client

  const save = async (action: () => Promise<Brand>, uploaded = false) => {
    if (!client) return
    setBusy(true)
    setError(null)
    try {
      setClientBrand(client.id, await action())
      if (uploaded) onProject({ ...projectRef.current, showLogo: true }) // a new logo is meant to show
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const font = brand?.font ?? 'Noto Sans TC'
  const color = brand?.color ?? null
  // The native change event fires when the picker closes (React's onChange fires on every drag), so save there;
  // onBlur stays as the fallback. The same colour is never saved twice.
  const saveColor = () => {
    const next = draft
    setDraft(null)
    if (next && next !== color) void save(() => putBrand(client!.id, { font, color: next }))
  }
  const saveColorRef = useRef(saveColor)
  saveColorRef.current = saveColor
  useEffect(() => {
    const el = colorRef.current
    if (!el) return
    const onNative = () => saveColorRef.current()
    el.addEventListener('change', onNative)
    return () => el.removeEventListener('change', onNative)
  }, [])
  return (
    <div className="cv-ed-tool">
      <p className="muted small">{t('editor.brand.shared')}</p>
      <div className="cv-ed-field">
        <span>{t('editor.brand.logo')}</span>
        {client && brand?.logo ? (
          <img className="cv-ed-logo" src={`/api/clients/${encodeURIComponent(client.id)}/brand/logo?v=${encodeURIComponent(brand.logo)}`} alt={t('editor.brand.logo.alt')} />
        ) : (
          <span className="muted small">{t('editor.brand.logo.none')}</span>
        )}
        <div className="cv-ed-tool-row">
          <button type="button" className="btn btn-ghost btn-sm cv-ed-upload" disabled={off} onClick={() => logoRef.current?.click()}>
            {brand?.logo ? t('editor.brand.logo.replace') : t('editor.brand.logo.upload')}
          </button>
          <input
              ref={logoRef}
              type="file"
              accept={LOGO_TYPES.join(',')}
              hidden
              disabled={off}
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void save(() => putLogo(client!.id, f), true)
              }}
            />
          {brand?.logo && (
            <button type="button" className="btn btn-ghost btn-sm" disabled={off} onClick={() => void save(() => deleteLogo(client!.id))}>
              {t('editor.brand.logo.remove')}
            </button>
          )}
        </div>
        <span className="muted small">{t('editor.brand.logo.hint')}</span>
      </div>
      <label className="cv-ed-switch">
        <input
          type="checkbox"
          checked={project.showLogo && !!brand?.logo}
          disabled={readOnly || !brand?.logo}
          onChange={(e) => onProject({ ...project, showLogo: e.target.checked })}
        />
        <span>{t('editor.brand.show')}</span>
        {!brand?.logo && <span className="muted small">{t('editor.brand.show.needLogo')}</span>}
      </label>
      {[
        { legend: 'editor.brand.size', field: 'logoSize', items: SIZES },
        { legend: 'editor.brand.corner', field: 'logoCorner', items: CORNERS },
      ].map(({ legend, field, items }) => (
        <fieldset key={field} className="cv-ed-choice" disabled={readOnly || !brand?.logo}>
          <legend>{t(legend as Key)}</legend>
          {items.map(([v, label]) => (
            <button key={v} type="button" className="btn btn-ghost btn-sm" aria-pressed={project[field as 'logoSize' | 'logoCorner'] === v} onClick={() => onProject({ ...project, [field]: v })}>
              {t(label)}
            </button>
          ))}
        </fieldset>
      ))}
      <div className="cv-ed-field">
        <span>{t('editor.brand.color')}</span>
        <div className="cv-ed-tool-row">
          <input
            ref={colorRef}
            type="color"
            aria-label={t('editor.brand.color')}
            value={draft ?? color ?? FALLBACK_COLOR}
            disabled={off}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveColor}
          />
          <button type="button" className="btn btn-ghost btn-sm" disabled={off || !color} onClick={() => void save(() => putBrand(client!.id, { font, color: null }))}>
            {t('editor.brand.color.clear')}
          </button>
        </div>
      </div>
      <div className="cv-ed-field">
        <span>{t('editor.brand.font')}</span>
        <input type="text" readOnly value={font} aria-label={t('editor.brand.font')} />
      </div>
      {busy && <span className="muted small" role="status">{t('editor.brand.busy')}</span>}
      {error && <ErrorText text={error} />}
    </div>
  )
}
