import type { IdeaStatus, Shot } from '../../types'
import type { ShotListRow } from '../../lib/shotGrid'
import { t } from '../../lib/i18n'
import { ShotChecklist } from '../ShotChecklist'
import { TakeAddButton } from '../TakeAddButton'
import { useTakes } from '../useTakes'
import { canEdit, takeCountLabel, takesByShot } from '../../lib/takes'

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
  const state = useTakes(ideaId)
  const grouped = takesByShot(state.takes ?? [], shots.length)
  const editable = !!ideaId && canEdit(status)
  return (
    <div className="sg-listwrap" role="tabpanel">
      <div className="sg-listbar">
        <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>{t('grid.print')}</button>
      </div>
      <table className="sg-table" aria-label={t('grid.list.label')}>
        <thead>
          <tr>
            <th scope="col"><span className="sr-only">{t('grid.colThumb')}</span></th>
            <th scope="col"><span className="sr-only">{t('grid.colNum')}</span><span aria-hidden="true">#</span></th>
            {HEADS.map((k) => <th key={k}>{t(k === 'action' || k === 'line' ? `grid.show.${k}` : `grid.col.${k}`)}</th>)}
            {ideaId && <th scope="col">{t('grid.list.takes')}</th>}
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
              {ideaId && (
                <td className="sg-takecell">
                  <span className="muted small">{takeCountLabel(grouped[r.shotIndex] ?? [])}</span>
                  {editable && <TakeAddButton busy={state.busy.has(r.shotIndex)} onFile={(file) => void state.upload(r.shotIndex, file)} />}
                  {state.errors[r.shotIndex] && <p className="error" role="alert">{state.errors[r.shotIndex]}</p>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {ideaId && (
        <section className="sg-takes">
          <h2>{t('grid.list.takes')}</h2>
          <ShotChecklist ideaId={ideaId} status={status} shots={shots} state={state} />
        </section>
      )}
    </div>
  )
}
