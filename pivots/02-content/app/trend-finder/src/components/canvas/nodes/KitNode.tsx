import { t } from '../../../lib/i18n'
import { kitFileUrl } from '../../../lib/canvas/api'
import type { KitKind } from '../../../types'
import { useCanvas } from './ctx'
import { Ports } from './Ports'
import type { CvNodeProps } from './types'

// The cast of this video: the kit items it uses, with a button that opens the kit panel. One output, to the storyboards.
export function KitNode({ data: { node } }: CvNodeProps) {
  const { kit, clientId, readOnly, openKit } = useCanvas()
  const used = new Set(node.data.kitItems ?? [])
  const items = (kit?.items ?? []).filter((i) => used.has(i.id))
  return (
    <div className="cv-node cv-kit-node">
      <div className="cv-node-title">{t('canvas.node.kit')}</div>
      {!kit ? (
        <p className="small muted">{t('canvas.kit.node.unavailable')}</p>
      ) : items.length === 0 ? (
        <p className="small muted">{t('canvas.kit.node.empty')}</p>
      ) : (
        <ul className="cv-kit-cast">
          {items.map((i) => (
            <li key={i.id}>
              {i.images[0] ? <img src={kitFileUrl(clientId, i.images[0])} alt="" draggable={false} /> : <span className="cv-kit-thumb-none" aria-hidden="true" />}
              <span className="cv-kit-cast-name">{i.name}</span>
              <span className="small muted cv-kit-kind">{t(`canvas.kit.panel.kind.${i.kind satisfies KitKind}`)}</span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn btn-ghost btn-sm nodrag" disabled={!kit || readOnly} onClick={openKit}>
        {t('canvas.kit.node.edit')}
      </button>
      <Ports node={node} />
    </div>
  )
}
