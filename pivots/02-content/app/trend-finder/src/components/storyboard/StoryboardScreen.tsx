import { useEffect, useMemo, useState } from 'react'
import type { CanvasContext } from '../../lib/canvas/resource'
import type { Budget, CanvasState, GenModel } from '../../lib/canvas/types'
import { getBudget, getCanvas, getModels } from '../../lib/canvas/api'
import { budgetLeft, priceLabel } from '../../lib/canvas/graph'
import { cameraTag, gridCells, type GridCell } from '../../lib/shotGrid'
import type { Shot } from '../../types'
import { ff } from '../../lib/strings/freeform'
import { t } from '../../lib/i18n'
import { GridCard } from './GridCard'
import '../../styles/storyboard-grid.css'

interface Props {
  context: CanvasContext
  onShotsChange: (shots: Shot[]) => void
  onOpenCanvas: () => void
  onOpenEditor: () => void
  onBack: () => void
}

const COLS_KEY = 'remake.storyboard.cols'
const COLS = [3, 4, 6] as const
type Cols = (typeof COLS)[number]

function readCols(): Cols {
  try {
    const n = Number(localStorage.getItem(COLS_KEY))
    return COLS.find((c) => c === n) ?? 4
  } catch {
    return 4
  }
}

function saveCols(n: Cols): void {
  try {
    localStorage.setItem(COLS_KEY, String(n))
  } catch {
    /* blocked storage: the choice just won't persist */
  }
}

// The image model a frame would be made with: the node's saved one, else the first usable image model.
function modelFor(models: GenModel[], savedId: string | undefined): GenModel | undefined {
  const images = models.filter((m) => m.kind === 'image')
  return images.find((m) => m.id === savedId && m.available) ?? images.find((m) => m.available)
}

export default function StoryboardScreen({ context, onOpenCanvas, onOpenEditor, onBack }: Props) {
  const [state, setState] = useState<CanvasState | null>(null)
  const [models, setModels] = useState<GenModel[]>([])
  const [budget, setBudget] = useState<Budget | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [tab, setTab] = useState<'board' | 'list'>('board')
  const [cols, setCols] = useState<Cols>(readCols)
  const [show, setShow] = useState({ action: true, line: true, camera: true })
  const [selected, setSelected] = useState<number | null>(null)
  const { resource, readOnly } = context

  useEffect(() => {
    let cancelled = false
    setState(null)
    setError('')
    // Models and budget only feed the price label and budget line, so their failure never blocks the grid.
    Promise.all([getCanvas(resource), getModels().catch(() => []), getBudget().catch(() => null)]).then(
      ([s, m, b]) => { if (!cancelled) { setState(s); setModels(m); setBudget(b) } },
      (e) => { if (!cancelled) setError(String(e.message)) },
    )
    return () => { cancelled = true }
  }, [resource, attempt])

  const cells = useMemo(() => (state ? gridCells(state.doc, context.shots, state.generations) : []), [state, context.shots])

  if (!state) {
    return (
      <section className="sg-loading">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← {ff('back')}</button>
        {error
          ? <div role="alert">{error} <button className="btn btn-ghost btn-sm" onClick={() => setAttempt((a) => a + 1)}>{ff('reload')}</button></div>
          : <p>{t('canvas.loading')}</p>}
      </section>
    )
  }

  const left = budgetLeft(budget, 'image')
  const priceOf = (cell: GridCell): string => {
    const node = state.doc.nodes.find((n) => n.id === cell.nodeId)
    const model = modelFor(models, node?.data.model)
    return model ? priceLabel(model, undefined) : ''
  }
  const toggle = (k: keyof typeof show) => setShow((v) => ({ ...v, [k]: !v[k] }))
  // Task 4 wires these to the generation queue.
  const noop = () => {}

  return (
    <section className="sg">
      <header className="sg-top">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← {ff('back')}</button>
        <h1>{context.title}</h1>
        <div className="sg-bar">
          {left !== null && <span className="sg-budget">{t('grid.budget', { usd: left.toFixed(2) })}</span>}
          <button className="btn btn-ghost btn-sm" onClick={onOpenCanvas}>{t('grid.canvas')}</button>
          <button className="btn btn-primary btn-sm" onClick={onOpenEditor}>{t('grid.next')}</button>
        </div>
      </header>
      {readOnly && <p className="sg-notice" role="status">{t('grid.readOnly')}</p>}
      <div className="sg-tools">
        <div className="sg-seg" role="tablist">
          {(['board', 'list'] as const).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t(k === 'board' ? 'grid.tab.board' : 'grid.tab.list')}</button>
          ))}
        </div>
        <div className="sg-bar">
          <span className="sg-muted">{t('grid.cols')}</span>
          <div className="sg-seg">
            {COLS.map((n) => <button key={n} className={cols === n ? 'on' : ''} aria-pressed={cols === n} onClick={() => { setCols(n); saveCols(n) }}>{n}</button>)}
          </div>
          <span className="sg-muted">{t('grid.show')}</span>
          <div className="sg-seg">
            {(['action', 'line', 'camera'] as const).map((k) => (
              <button key={k} className={show[k] ? 'on' : ''} aria-pressed={show[k]} onClick={() => toggle(k)}>{t(`grid.show.${k}`)}</button>
            ))}
          </div>
        </div>
        <span className="sg-muted">{t('grid.shots', { n: cells.length })}</span>
      </div>
      {tab === 'board' ? (
        <div className="sg-grid" style={{ ['--n' as string]: cols }}>
          {cells.map((cell) => (
            <GridCard
              key={cell.shot.id ?? cell.index}
              cell={cell}
              selected={selected === cell.index}
              readOnly={readOnly}
              showAction={show.action}
              showLine={show.line}
              showCamera={show.camera}
              price={priceOf(cell)}
              onSelect={() => setSelected(cell.index)}
              onRefine={noop}
              onRegenerate={noop}
              onStep={noop}
            />
          ))}
        </div>
      ) : (
        <div className="sg-listwrap">
          <table className="sg-table">
            <thead><tr><th /><th>#</th><th>{t('grid.show.action')}</th><th>{t('grid.show.line')}</th><th>{t('grid.show.camera')}</th><th>{t('grid.col.seconds')}</th></tr></thead>
            <tbody>
              {cells.map((c) => (
                <tr key={c.shot.id ?? c.index}>
                  <td><div className="sg-thumb">{c.shown?.url && <img src={c.shown.url} alt="" loading="lazy" />}</div></td>
                  <td className="sg-mono">{c.index + 1}</td>
                  <td>{c.shot.shot}</td>
                  <td>{c.shot.line ?? <span className="sg-muted">{t('grid.noLine')}</span>}</td>
                  <td>{cameraTag(c.shot)}</td>
                  <td className="sg-mono">{c.shot.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
