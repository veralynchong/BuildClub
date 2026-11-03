import { useRef, useState } from 'react'
import { t, type Key } from '../../lib/i18n'
import { addKitImage, createKitItem, deleteKitImage, deleteKitItem, kitFileUrl, updateKitItem } from '../../lib/canvas/api'
import { checkImage } from '../../lib/canvas/upload'
import type { Kit, KitItem, KitKind } from '../../types'
import { ErrorText } from '../ErrorText'

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp'
const MAX_IMAGES = 4
const KINDS: [KitKind, Key][] = [
  ['character', 'canvas.kit.panel.kind.character'],
  ['product', 'canvas.kit.panel.kind.product'],
  ['place', 'canvas.kit.panel.kind.place'],
  ['style', 'canvas.kit.panel.kind.style'],
]

interface Props {
  clientId: string
  kit: Kit
  selected: string[] // ids of the kit items this plan uses
  onKit: (k: Kit) => void
  onSelected: (ids: string[]) => void
  onClose: () => void
}

// What is waiting for a yes/no in the panel: a whole item, or one of its images.
type Confirm = { itemId: string; image?: string } | null

// Top: edit the client's kit (shared by all of its plans). Bottom: tick which items this plan uses.
export function KitPanel({ clientId, kit, selected, onKit, onSelected, onClose }: Props) {
  const [busy, setBusy] = useState<Record<string, 'saving' | 'uploading'>>({})
  const [errors, setErrors] = useState<Record<string, string>>({}) // by item id; '' is the add form
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [newName, setNewName] = useState('')
  const [newKind, setNewKind] = useState<KitKind>('character')
  const kitRef = useRef(kit) // the latest kit, read after a request finishes
  kitRef.current = kit
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadFor = useRef<string | null>(null)

  const setError = (id: string, text: string | null) =>
    setErrors((e) => {
      const next = { ...e }
      if (text) next[id] = text
      else delete next[id]
      return next
    })

  // Runs one request for an item (or the add form, id ''), shows its error under the item, and returns whether it worked.
  const run = async (id: string, state: 'saving' | 'uploading', action: () => Promise<void>): Promise<boolean> => {
    setBusy((b) => ({ ...b, [id]: state }))
    setError(id, null)
    try {
      await action()
      return true
    } catch (e) {
      setError(id, e instanceof Error ? e.message : String(e))
      return false
    } finally {
      setBusy((b) => {
        const next = { ...b }
        delete next[id]
        return next
      })
    }
  }

  const replace = (item: KitItem) => onKit({ items: kitRef.current.items.map((i) => (i.id === item.id ? item : i)) })
  const patch = (item: KitItem, body: Parameters<typeof updateKitItem>[2]) => run(item.id, 'saving', async () => replace(await updateKitItem(clientId, item.id, body)))

  const add = async () => {
    const name = newName.trim()
    if (!name) return
    const ok = await run('', 'saving', async () => {
      const created = await createKitItem(clientId, { kind: newKind, name })
      onKit({ items: [...kitRef.current.items, created] })
    })
    if (ok) setNewName('')
  }

  const toggle = (id: string, on: boolean) => {
    const next = new Set(selected)
    if (on) next.add(id)
    else next.delete(id)
    onSelected(kit.items.filter((i) => next.has(i.id)).map((i) => i.id))
  }

  const remove = async (item: KitItem, image?: string) => {
    setConfirm(null)
    await run(item.id, 'saving', async () => {
      if (image) return replace(await deleteKitImage(clientId, item.id, image))
      const next = await deleteKitItem(clientId, item.id)
      onKit(next)
      if (selected.includes(item.id)) onSelected(selected.filter((id) => id !== item.id))
    })
  }

  const upload = async (item: KitItem, file: File) => {
    const bad = checkImage(file)
    if (bad) return setError(item.id, t(bad))
    await run(item.id, 'uploading', async () => replace(await addKitImage(clientId, item.id, file)))
  }

  const askRow = (item: KitItem, image?: string) => (
    <div className="cv-kit-confirm" role="alert">
      <span>{image ? t('canvas.kit.panel.confirm.image') : t('canvas.kit.panel.confirm.item', { name: item.name })}</span>
      <button type="button" className="btn btn-sm" onClick={() => void remove(item, image)}>{t('canvas.kit.panel.confirm.yes')}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>{t('canvas.kit.panel.confirm.no')}</button>
    </div>
  )

  return (
    <aside className="cv-kit" aria-label={t('canvas.kit.panel.title')}>
      <div className="cv-kit-head">
        <h2>{t('canvas.kit.panel.title')}</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{t('canvas.kit.panel.close')}</button>
      </div>
      <p className="muted small">{t('canvas.kit.panel.hint')}</p>
      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          const item = kit.items.find((i) => i.id === uploadFor.current)
          if (f && item) void upload(item, f)
        }}
      />
      {kit.items.length === 0 && <p className="muted small">{t('canvas.kit.panel.empty')}</p>}
      {kit.items.map((item) => {
        const working = busy[item.id]
        const asking = confirm?.itemId === item.id ? confirm : null
        return (
          <section key={item.id} className="cv-kit-item cv-ed-tool">
            <div className="cv-ed-tool-row">
              <select
                aria-label={t('canvas.kit.panel.kind')}
                value={item.kind}
                disabled={!!working}
                onChange={(e) => void patch(item, { kind: e.target.value as KitKind })}
              >
                {KINDS.map(([k, label]) => <option key={k} value={k}>{t(label)}</option>)}
              </select>
              <input
                type="text"
                className="cv-kit-name"
                aria-label={t('canvas.kit.panel.name')}
                key={`${item.id}:${item.name}`}
                defaultValue={item.name}
                maxLength={40}
                disabled={!!working}
                onBlur={async (e) => {
                  const el = e.currentTarget
                  const name = el.value.trim()
                  if (name === item.name) return
                  if (!(await patch(item, { name }))) el.value = item.name
                }}
              />
            </div>
            <label className="cv-ed-field">
              <span>{t('canvas.kit.panel.note')}</span>
              <input
                type="text"
                key={`${item.id}:${item.updatedAt}:note`}
                defaultValue={item.note}
                placeholder={t('canvas.kit.panel.note.ph')}
                maxLength={200}
                disabled={!!working}
                onBlur={async (e) => {
                  const el = e.currentTarget
                  if (el.value === item.note) return
                  if (!(await patch(item, { note: el.value }))) el.value = item.note
                }}
              />
            </label>
            <div className="cv-ed-field">
              <span>{t('canvas.kit.panel.images', { n: item.images.length })}</span>
              {item.images.length === 0 && <span className="muted small">{t('canvas.kit.panel.noImages')}</span>}
              <div className="cv-kit-images">
                {item.images.map((name) => (
                  <div key={name} className="cv-kit-image">
                    <img src={kitFileUrl(clientId, name)} alt={t('canvas.kit.panel.image.alt', { name: item.name })} />
                    <button type="button" className="btn btn-ghost btn-sm" disabled={!!working} onClick={() => setConfirm({ itemId: item.id, image: name })}>
                      {t('canvas.kit.panel.deleteImage')}
                    </button>
                  </div>
                ))}
              </div>
              {asking?.image && askRow(item, asking.image)}
            </div>
            <div className="cv-ed-tool-row">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={!!working || item.images.length >= MAX_IMAGES}
                onClick={() => {
                  uploadFor.current = item.id
                  fileRef.current?.click()
                }}
              >
                {t('canvas.kit.panel.upload')}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={!!working} onClick={() => setConfirm({ itemId: item.id })}>
                {t('canvas.kit.panel.delete')}
              </button>
              {working && <span className="muted small" role="status">{working === 'uploading' ? t('canvas.kit.panel.uploading') : t('canvas.kit.panel.saving')}</span>}
            </div>
            {asking && !asking.image && askRow(item)}
            {errors[item.id] && <p className="cv-kit-error small" role="alert"><ErrorText text={errors[item.id]} /></p>}
          </section>
        )
      })}
      <form
        className="cv-kit-add cv-ed-tool-row"
        onSubmit={(e) => {
          e.preventDefault()
          void add()
        }}
      >
        <select aria-label={t('canvas.kit.panel.kind')} value={newKind} onChange={(e) => setNewKind(e.target.value as KitKind)}>
          {KINDS.map(([k, label]) => <option key={k} value={k}>{t(label)}</option>)}
        </select>
        <input type="text" aria-label={t('canvas.kit.panel.name')} placeholder={t('canvas.kit.panel.name')} maxLength={40} value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button type="submit" className="btn btn-sm" disabled={!newName.trim() || !!busy['']}>{t('canvas.kit.panel.add')}</button>
      </form>
      {errors[''] && <p className="cv-kit-error small" role="alert"><ErrorText text={errors['']} /></p>}

      <fieldset className="cv-kit-use cv-ed-choice">
        <legend>{t('canvas.kit.panel.use')}</legend>
        <p className="muted small">{kit.items.length ? t('canvas.kit.panel.useHint') : t('canvas.kit.panel.useNone')}</p>
        {kit.items.map((item) => (
          <label key={item.id} className="cv-ed-switch">
            <input type="checkbox" checked={selected.includes(item.id)} onChange={(e) => toggle(item.id, e.target.checked)} />
            <span>{item.name}</span>
            <span className="muted small">{t(KINDS.find(([k]) => k === item.kind)![1])}</span>
          </label>
        ))}
      </fieldset>
    </aside>
  )
}
