import { t } from '../../lib/i18n'
import type { NodeKind } from '../../lib/canvas/types'
import { AddNodeMenu } from './AddNodeMenu'

interface Props {
  mode: 'select' | 'pan'
  onMode: (m: 'select' | 'pan') => void
  addKinds: NodeKind[]
  disabledKinds?: NodeKind[]
  onAdd: (k: NodeKind) => void
  readOnly: boolean
  onAgent?: () => void // the ✦ button shows only when set
}

// The floating tool rail on the board's left edge: select, pan, add a node and (later) the agent.
export function ToolRail({ mode, onMode, addKinds, disabledKinds, onAdd, readOnly, onAgent }: Props) {
  return (
    <div className="cv-rail" role="toolbar" aria-orientation="vertical" aria-label={t('canvas.tool.label')}>
      <button type="button" className={mode === 'select' ? 'is-on' : ''} aria-pressed={mode === 'select'} aria-label={t('canvas.tool.select')} title={t('canvas.tool.select')} onClick={() => onMode('select')}>
        ↖
      </button>
      <button type="button" className={mode === 'pan' ? 'is-on' : ''} aria-pressed={mode === 'pan'} aria-label={t('canvas.tool.pan')} title={t('canvas.tool.pan')} onClick={() => onMode('pan')}>
        ✋
      </button>
      <AddNodeMenu className="cv-rail-add" kinds={addKinds} disabledKinds={disabledKinds} label={t('canvas.add')} icon="+" disabled={readOnly} onPick={onAdd} />
      {onAgent && (
        <button type="button" aria-label={t('canvas.tool.agent')} title={t('canvas.tool.agent')} onClick={onAgent}>
          ✦
        </button>
      )}
    </div>
  )
}
