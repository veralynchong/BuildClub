import { useState } from 'react'
import { t } from '../../../lib/i18n'
import { checkMusic, deleteMusic, putMusic, type CutState } from '../../../lib/cut'
import type { EditProject } from '../../../lib/editor/types'
import { ErrorText } from '../../ErrorText'

const DEFAULT_VOLUME = 0.5

export type MusicFile = CutState['music']

interface Props {
  ideaId: string
  project: EditProject
  file: MusicFile | undefined // undefined while it is still being looked up
  onFile: (file: MusicFile) => void
  readOnly: boolean
  onProject: (p: EditProject) => void
}

// The plan's music track (shared with Make the video) and how loud it plays under the clips.
export function MusicTool({ ideaId, project, file, onFile, readOnly, onProject }: Props) {
  const [licensed, setLicensed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const off = readOnly || busy

  const run = async (action: () => Promise<CutState>, after: () => void) => {
    setBusy(true)
    setError(null)
    try {
      const state = await action()
      onFile(state.music)
      after()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      setLicensed(false) // each upload needs its own confirmation
    }
  }

  const pick = (f: File | undefined) => {
    if (!f) return
    const problem = checkMusic(f)
    if (problem) return setError(problem)
    void run(() => putMusic(ideaId, f), () => {
      if (!project.music) onProject({ ...project, music: { volume: DEFAULT_VOLUME } })
    })
  }

  const volume = project.music?.volume ?? DEFAULT_VOLUME
  return (
    <div className="cv-ed-tool">
      {file === undefined ? (
        <p className="muted small">{t('editor.music.loading')}</p>
      ) : file ? (
        <>
          <div className="cv-ed-tool-row">
            <span className="cv-ed-file" title={file.name}>{file.name}</span>
            <button type="button" className="btn btn-ghost btn-sm" disabled={off} onClick={() => void run(() => deleteMusic(ideaId), () => onProject({ ...project, music: null }))}>
              {t('editor.music.remove')}
            </button>
          </div>
          <label className="cv-ed-field cv-ed-volume">
            <span>{t('editor.music.volume')}</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(volume * 100)}
              disabled={off}
              onChange={(e) => onProject({ ...project, music: { volume: Number(e.target.value) / 100 } })}
            />
            <span className="cv-ed-audio-pct">{Math.round(volume * 100)}%</span>
          </label>
        </>
      ) : (
        <p className="muted small">{t('editor.music.none')}</p>
      )}
      {file !== undefined && (
        <>
          <label className="cv-ed-license small">
            <input type="checkbox" checked={licensed} disabled={off} onChange={(e) => setLicensed(e.target.checked)} />
            <span>{t('editor.music.license')}</span>
          </label>
          <label className={`btn btn-ghost btn-sm cv-ed-upload${!licensed || off ? ' is-disabled' : ''}`} aria-disabled={!licensed || off}>
            {busy ? t('editor.music.uploading') : t('editor.music.choose')}
            <input
              type="file"
              accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav"
              hidden
              disabled={!licensed || off}
              onChange={(e) => {
                pick(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
        </>
      )}
      {error && <ErrorText text={error} />}
    </div>
  )
}
