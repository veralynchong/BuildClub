import type { IdeaStatus, Shot } from '../../types'
import type { ShotListRow } from '../../lib/shotGrid'
import { t } from '../../lib/i18n'
import { ShotChecklist } from '../ShotChecklist'

interface Props {
  rows: ShotListRow[]
  // Takes are saved per plan, so a workspace without a plan shows the table only.
  ideaId: string | null
  status: IdeaStatus
  shots: Shot[]
}

const HEADS = ['action', 'line', 'size', 'angle', 'movement', 'lens', 'gear', 'length'] as const

// The camera operator's printable shot list, with the takes checklist below it.
export function ShotListTable({ rows, ideaId, status, shots }: Props) {
  return (
    <div className="sg-listwrap" role="tabpanel">
      <div className="sg-listbar">
        <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>{t('grid.print')}</button>
      </div>
      <table className="sg-table" aria-label={t('grid.list.label')}>
        <thead>
          <tr>
            <th />
            <th>#</th>
            {HEADS.map((k) => <th key={k}>{t(k === 'action' || k === 'line' ? `grid.show.${k}` : `grid.col.${k}`)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.n}>
              <td><div className="sg-thumb">{r.thumb && <img src={r.thumb} alt="" loading="lazy" />}</div></td>
              <td className="sg-mono">{r.n}</td>
              <td>{r.action}</td>
              <td>{r.line}</td>
              <td>{r.size}</td>
              <td>{r.angle}</td>
              <td>{r.movement}</td>
              <td>{r.lens}</td>
              <td>{r.gear}</td>
              <td className="sg-mono">{r.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {ideaId && (
        <section className="sg-takes">
          <h2>{t('grid.list.takes')}</h2>
          <ShotChecklist ideaId={ideaId} status={status} shots={shots} />
        </section>
      )}
    </div>
  )
}
