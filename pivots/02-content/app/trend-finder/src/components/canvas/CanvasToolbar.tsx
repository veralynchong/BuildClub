import { t } from '../../lib/i18n'

interface Props {
  title: string
  clientName: string
  onBack: () => void
  backLabel: string
  mode: 'canvas' | 'timeline'
  onMode: (m: 'canvas' | 'timeline') => void
  fullscreen: boolean
  onFullscreen: (on: boolean) => void
  saveText: string
  children?: React.ReactNode // the right-hand slot (total, Run all, Send)
}

// The slim bar over the board: back, plan name, Canvas/Timeline switch, save state, full screen and a slot for actions.
export function CanvasToolbar({ title, clientName, onBack, backLabel, mode, onMode, fullscreen, onFullscreen, saveText, children }: Props) {
  return (
    <header className="cv-bar">
      <button type="button" className="cv-bar-back" aria-label={t('canvas.back', { label: backLabel })} title={t('canvas.back', { label: backLabel })} onClick={onBack}>
        ←
      </button>
      <div className="cv-bar-title">
        <h1>{title}</h1>
        {clientName && <span className="small muted">{clientName}</span>}
      </div>
      <div className="cv-seg" role="group" aria-label={t('canvas.flow.label')}>
        {(['canvas', 'timeline'] as const).map((m) => (
          <button key={m} type="button" className={mode === m ? 'is-on' : ''} aria-pressed={mode === m} onClick={() => onMode(m)}>
            {t(`canvas.toolbar.${m}`)}
          </button>
        ))}
      </div>
      <span className="cv-save small muted" role="status">
        {saveText}
      </span>
      <div className="cv-bar-actions">
        {children}
        <button
          type="button"
          className="cv-bar-icon"
          aria-pressed={fullscreen}
          aria-label={fullscreen ? t('canvas.toolbar.exitFull') : t('canvas.toolbar.full')}
          title={fullscreen ? t('canvas.toolbar.exitFull') : t('canvas.toolbar.full')}
          onClick={() => onFullscreen(!fullscreen)}
        >
          {fullscreen ? '⤡' : '⤢'}
        </button>
      </div>
    </header>
  )
}
