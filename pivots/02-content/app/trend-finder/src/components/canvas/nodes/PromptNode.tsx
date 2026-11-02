import { t } from '../../../lib/i18n'
import { useCanvas } from './ctx'
import { PortLabels, Ports } from './Ports'
import type { CvNodeProps } from './types'

export function PromptNode({ id, data: { node } }: CvNodeProps) {
  const { readOnly, updateData } = useCanvas()
  return (
    <div className="cv-node cv-prompt">
      <div className="cv-node-title">{t('canvas.node.prompt')}</div>
      <textarea
        className="cv-textarea nodrag nowheel"
        aria-label={t('canvas.prompt.label')}
        placeholder={t('canvas.prompt.placeholder')}
        value={node.data.text ?? ''}
        readOnly={readOnly}
        rows={3}
        onChange={(e) => updateData(id, { text: e.target.value })}
      />
      <PortLabels node={node} />
      <Ports node={node} />
    </div>
  )
}
