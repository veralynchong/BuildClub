import { t } from '../../../lib/i18n'
import { kitFileUrl } from '../../../lib/canvas/api'
import type { KitKind } from '../../../types'
import { CardHead } from './Card'
import { useCanvas } from './ctx'
import { Ports } from './Ports'
import type { CvNodeProps } from './types'

// The cast of this video: the kit items it uses, with a button that opens the kit panel. One output, to the storyboards.
export function KitNode({ data: { node } }: CvNodeProps) {
  const { kit, kitFailed, clientId, readOnly, openKit } = useCanvas()
  const used = new Set(node.data.kitItems ?? [])
  const items = (kit?.items ?? []).filter((i) => used.has(i.id))
  return (
    <div className="cv-node cv-card cv-kit-node">
      <CardHead title={t('canvas.node.kit')} status={items.length > 0 ? { key: 'canvas.kit.node.count', vars: { n: items.length }, tone: 'none' } : null} />
      {!kit ? (
        <p className="small muted">{kitFailed || !clientId ? t('canvas.kit.node.unavailable') : t('canvas.kit.node.loading')}</p>
      ) : items.length === 0 ? (
        <p className="small muted">{t('canvas.kit.node.empty')}</p>
      ) : (
        <>
          {/* swatches: one per item, its first image; the names follow underneath */}
          <ul className="cv-kit-cast">
            {items.map((i) => {
              const name = `${i.name} · ${t(`canvas.kit.panel.kind.${i.kind satisfies KitKind}`)}`
              return (
                <li key={i.id} title={name}>
                  {i.images[0] ? <img src={kitFileUrl(clientId, i.images[0])} alt={name} draggable={false} /> : <span className="cv-kit-thumb-none" role="img" aria-label={name} />}
                </li>
              )
            })}
          </ul>
          <p className="cv-kit-names small muted">{items.map((i) => i.name).join(' · ')}</p>
        </>
      )}
      <button type="button" className="btn btn-ghost btn-sm nodrag" disabled={!kit || readOnly} onClick={openKit}>
        {t('canvas.kit.node.edit')}
      </button>
      <Ports node={node} />
    </div>
  )
}
