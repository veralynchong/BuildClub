import type { DemoSession } from '../../lib/demo/session'
import { DEMO_STEPS } from '../../lib/demo/steps'
import './demo.css'

export type DemoGuideProps = {
  session: DemoSession
  lang: 'en' | 'zh-Hant'
  onNext: () => void
  onPrevious: () => void
  onReset: () => void
  onExit: () => void
  disabled?: boolean
}

export function DemoGuide({ session, lang, onNext, onPrevious, onReset, onExit, disabled = false }: DemoGuideProps) {
  if (!session.active) return null
  const index = DEMO_STEPS.findIndex(step => step.id === session.stepId)
  const step = DEMO_STEPS[index][lang]
  const zh = lang === 'zh-Hant'
  const nextDisabled = disabled || index === DEMO_STEPS.length - 1 || (session.stepId === 'route' && session.route === null)

  return (
    <nav className="demo-guide" aria-label={zh ? '豆腐示範導覽' : 'Tofu demo guide'}>
      <div className="demo-guide__copy" aria-live="polite" aria-atomic="true">
        <span className="demo-guide__progress">{zh ? `步驟 ${index + 1}/7` : `Step ${index + 1}/7`} · {zh ? '預先準備的示範' : 'Prepared demo'}</span>
        <strong className="demo-guide__title">{step.title}</strong>
        <p className="demo-guide__description">{step.description}</p>
      </div>
      <div className="demo-guide__actions">
        <button type="button" onClick={onPrevious} disabled={disabled || index === 0}>{zh ? '上一步' : 'Previous'}</button>
        <button type="button" className="demo-guide__next" onClick={onNext} disabled={nextDisabled}>{zh ? '下一步' : 'Next'}</button>
        <button type="button" onClick={onReset} disabled={disabled}>{zh ? '重新開始' : 'Restart'}</button>
        <button type="button" onClick={onExit} disabled={disabled}>{zh ? '退出導覽' : 'Exit guide'}</button>
      </div>
    </nav>
  )
}
