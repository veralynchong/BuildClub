import { useState } from 'react'
import { t, tp } from '../../lib/i18n'
import { edlUrl } from '../../lib/editor/aiApi'
import { PLATFORMS, PRESETS, exportSettings, secondsOver, type Side, type ZoneWarning } from '../../lib/editor/presets'
import type { EditProject, ExportPreset } from '../../lib/editor/types'
import { ErrorText } from '../ErrorText'

interface Props {
  project: EditProject
  planId: string | null // the EDL is made from the saved timeline of a plan; a workspace has none
  seconds: number
  warnings: ZoneWarning[]
  safe: boolean
  readOnly: boolean
  hasMusic: boolean
  onSafe: (on: boolean) => void
  onProject: (p: EditProject) => void
  onShow: (sec: number) => void // seek the player to a warning
  flush: () => Promise<string> // saves the edit first, so the EDL is of what is on screen
}

const sideKey: Record<Side, 'editor.exp.side.top' | 'editor.exp.side.bottom' | 'editor.exp.side.right'> = {
  top: 'editor.exp.side.top', bottom: 'editor.exp.side.bottom', right: 'editor.exp.side.right',
}

const maxLabel = (sec: number): string => (sec % 60 === 0 ? `${sec / 60} min` : `${sec}s`)

// The export popover's choices: platform, loudness, music ducking, the safe-zone check and the EDL.
export function ExportOptions({ project, planId, seconds, warnings, safe, readOnly, hasMusic, onSafe, onProject, onShow, flush }: Props) {
  const settings = exportSettings(project)
  const platform = PLATFORMS[settings.preset]
  const over = secondsOver(seconds, settings.preset)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const setExport = (patch: Partial<typeof settings>) => onProject({ ...project, export: { ...settings, ...patch } })

  const download = async (format: 'edl' | 'otio') => {
    if (!planId || busy) return
    setBusy(true)
    setErr('')
    try {
      if ((await flush()) !== 'saved') throw new Error(t('editor.export.saveFailed'))
      const r = await fetch(edlUrl(planId, format))
      if (!r.ok) throw new Error(((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? t('editor.exp.edlFailed'))
      const href = URL.createObjectURL(await r.blob())
      const a = document.createElement('a')
      a.href = href
      a.download = `timeline.${format}`
      a.click()
      setTimeout(() => URL.revokeObjectURL(href), 1000)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cv-ed-expopts" data-testid="export-options">
      <label className="cv-ed-field">
        <span>{t('editor.exp.platform')}</span>
        <select value={settings.preset} disabled={readOnly} onChange={(e) => setExport({ preset: e.target.value as ExportPreset })}>
          {PRESETS.map((id) => <option key={id} value={id}>{PLATFORMS[id].label}</option>)}
        </select>
      </label>
      <span className="muted small">{t('editor.exp.size', { max: maxLabel(platform.maxSeconds) })}</span>
      {over > 0 && <p className="error small" role="alert">{t('editor.exp.over', { sec: Math.ceil(over), platform: platform.label })}</p>}
      <label className="cv-ed-switch" title={t('editor.exp.loudnormHelp')}>
        <input type="checkbox" checked={settings.loudnorm} disabled={readOnly} onChange={(e) => setExport({ loudnorm: e.target.checked })} />
        <span>{t('editor.exp.loudnorm')}</span>
      </label>
      <label className="cv-ed-switch" title={t('editor.exp.duckHelp')}>
        <input type="checkbox" checked={hasMusic && project.music?.duck !== false} disabled={readOnly || !hasMusic}
          onChange={(e) => project.music && onProject({ ...project, music: { ...project.music, duck: e.target.checked } })} />
        <span>{t('editor.exp.duck')}</span>
        {!hasMusic && <span className="muted small">{t('editor.exp.duckNeedsMusic')}</span>}
      </label>
      <label className="cv-ed-switch">
        <input type="checkbox" checked={safe} onChange={(e) => onSafe(e.target.checked)} />
        <span>{t('editor.exp.safe')}</span>
      </label>
      {warnings.length === 0 ? (
        <p className="muted small">{t('editor.exp.safeOk', { platform: platform.label })}</p>
      ) : (
        <ul className="cv-ed-expopts-warn small">
          {warnings.map((w) => (
            <li key={`${w.kind}-${w.side}`}>
              <span>{tp(w.kind === 'text' ? 'editor.exp.warn.text' : 'editor.exp.warn.caption', w.count, { side: t(sideKey[w.side]), platform: platform.label })}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onShow(w.at)}>{t('editor.exp.warn.show')}</button>
            </li>
          ))}
        </ul>
      )}
      {warnings.length > 0 && <span className="muted small">{t('editor.exp.safeApprox')}</span>}
      {planId && (
        <>
          <div className="cv-ed-tool-row">
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy || project.clips.length === 0} onClick={() => void download('edl')}>{t('editor.exp.edl')}</button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy || project.clips.length === 0} onClick={() => void download('otio')}>{t('editor.exp.otio')}</button>
          </div>
          <span className="muted small">{t('editor.exp.edlNote')}</span>
        </>
      )}
      {err && <ErrorText text={err} />}
    </div>
  )
}
