import { useEffect, useState } from 'react'
import type { IdeaStatus, Shot } from '../types'
import { t } from '../lib/i18n'
import { CameraTags } from './CameraTags'
import { canEdit, checklistProgress, chooseTake, deleteTake, formatSize, takesByShot } from '../lib/takes'
import { TakeAddButton } from './TakeAddButton'
import { useTakes, type TakesState } from './useTakes'

interface Props {
  ideaId: string
  status: IdeaStatus
  shots: Shot[]
  // Called whenever the loaded takes change: how many shots have a chosen take.
  onProgress?: (done: number) => void
  // Takes already loaded by a parent that shows them too (the Storyboard shot list); otherwise this loads its own.
  state?: TakesState
}

// Per-shot filming checklist: upload real takes for each shot, watch them, pick the one to use.
export function ShotChecklist({ ideaId, status, shots, onProgress, state }: Props) {
  const own = useTakes(state ? null : ideaId)
  const { takes, loadError, busy, errors, run, upload } = state ?? own
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const shotCount = shots.length
  useEffect(() => {
    if (takes) onProgress?.(checklistProgress(shotCount, takes).done)
  }, [takes, shotCount, onProgress])

  const editable = canEdit(status)
  if (!editable && (!takes || takes.length === 0) && !loadError) return null

  const { done, total } = checklistProgress(shots.length, takes ?? [])
  const grouped = takesByShot(takes ?? [], shots.length)

  return (
    <section className="block shot-checklist">
      <div className="shot-checklist-head">
        <h3>{t('plan.takes.title')}</h3>
        {takes && (
          <span className="muted small">
            {t('plan.takes.progress', { done, total })}
          </span>
        )}
      </div>
      {!editable && (
        <p className="muted small">{t('plan.takes.reopened')}</p>
      )}
      {loadError && (
        <p className="error" role="alert">
          {t('plan.takes.err.load')}
        </p>
      )}
      {takes && (
        <ol className="shot-checklist-list">
          {shots.map((s, i) => (
            <li key={i}>
              <div className="shot-checklist-shot">
                <span className="shot-checklist-n">{i + 1}.</span>
                <div>
                  {s.time && <span className="shot-time">[{s.time}]</span>} {s.shot}
                  {s.text && <span className="shot-text">{t('plan.takes.textOnScreen', { text: s.text })}</span>}
                  <CameraTags shot={s} />
                </div>
              </div>
              {grouped[i].length > 0 && (
                <ul className="take-list">
                  {grouped[i].map((tk) => (
                    <li key={tk.id} className={tk.chosen ? 'take is-chosen' : 'take'}>
                      <video controls preload="metadata" playsInline src={tk.url} />
                      <span className="take-name" title={tk.name}>
                        {tk.name}
                      </span>
                      <span className="muted small">{formatSize(tk.size)}</span>
                      {tk.cleanedFrom && <span className="take-chosen">{t('canvas.footage.cleanedBadge')}</span>}
                      {tk.chosen && <span className="take-chosen">{t('plan.takes.chosen')}</span>}
                      {editable &&
                        (confirmDelete === tk.id ? (
                          <span className="take-actions">
                            <span className="small">{t('plan.takes.deleteQ')}</span>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                setConfirmDelete(null)
                                void run(i, () => deleteTake(ideaId, tk.id))
                              }}
                            >
                              {t('plan.takes.delete')}
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>
                              {t('plan.takes.keep')}
                            </button>
                          </span>
                        ) : (
                          <span className="take-actions">
                            {!tk.chosen && (
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void run(i, () => chooseTake(ideaId, tk.id))}>
                                {t('plan.takes.use')}
                              </button>
                            )}
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(tk.id)}>
                              {t('plan.takes.delete')}
                            </button>
                          </span>
                        ))}
                    </li>
                  ))}
                </ul>
              )}
              {editable && (
                <TakeAddButton busy={busy.has(i)} onFile={(file) => void upload(i, file)} />
              )}
              {errors[i] && (
                <p className="error" role="alert">
                  {errors[i]}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
