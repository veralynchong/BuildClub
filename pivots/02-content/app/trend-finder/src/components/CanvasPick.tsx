import { useEffect, useState } from 'react'
import type { Format, SavedIdea, Video } from '../types'
import type { Workspace } from '../lib/canvas/resource'
import { createWorkspace, listWorkspaces } from '../lib/canvas/api'
import { ff } from '../lib/strings/freeform'
import { planName } from './plans/moves'

interface Props {
  clientId: string
  clientName: string
  plans: SavedIdea[]
  videoById: Map<string, Video>
  formatById: Map<string, Format>
  onPick: (ideaId: string) => void
  onWorkspace: (workspace: Workspace) => void
}
export function CanvasPick(p: Props) {
  const [spaces, setSpaces] = useState<Workspace[]>([])
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    listWorkspaces(p.clientId).then((ws) => { if (!cancelled) { setSpaces(ws); setError('') } }, (e) => !cancelled && setError(e.message))
    return () => { cancelled = true }
  }, [p.clientId, attempt])
  const create = async () => {
    if (busy) return
    setBusy(true); setError('')
    try { p.onWorkspace((await createWorkspace(p.clientId, title.trim() || ff('title'))).workspace) }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); setBusy(false) }
  }
  return <section className="fc-picker"><header><span>{p.clientName}</span><h1>{ff('spaces')}</h1><p>{ff('intro')}</p></header>
    <form className="fc-new-workspace" onSubmit={(e) => { e.preventDefault(); void create() }}><label htmlFor="canvas-name">{ff('name')}</label><div><input id="canvas-name" placeholder={ff('title')} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} /><button className="fc-primary" disabled={busy}>＋ {ff('create')}</button></div></form>
    {error && <p role="alert">{error} <button onClick={() => setAttempt((a) => a + 1)}>{ff('reload')}</button></p>}
    <div className="fc-workspace-grid">{spaces.map((w) => <button className="fc-workspace" key={w.id} onClick={() => p.onWorkspace(w)}><div>✧</div><strong>{w.title}</strong><small>{new Date(w.updatedAt * (w.updatedAt < 1e12 ? 1000 : 1)).toLocaleDateString()}</small></button>)}</div>
    {p.plans.length > 0 && <><h2>{ff('existing')}</h2><div className="fc-workspace-grid">{p.plans.map((idea) => { const v = p.videoById.get(idea.videoId); return <button className="fc-workspace is-legacy" key={idea.id} onClick={() => p.onPick(idea.id)}><div>▦</div><strong>{v ? planName(v, p.formatById.get(v.formatId)) : idea.id}</strong><small>{idea.status}</small></button> })}</div></>}
  </section>
}
