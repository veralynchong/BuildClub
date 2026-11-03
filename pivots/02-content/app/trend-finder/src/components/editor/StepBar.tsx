import { t } from '../../lib/i18n'
import { EDITOR_STEPS, STEP_LABEL, type EditorStep } from '../../lib/editor/steps'

// The five steps of making the video, each with a tick once it is done. A step jumps to its tool or the export controls.
export function StepBar({ done, active, onStep }: { done: Record<EditorStep, boolean>; active: EditorStep | null; onStep: (step: EditorStep) => void }) {
  return (
    <nav aria-label={t('editor.steps')}>
      <ol className="cv-ed-steps">
        {EDITOR_STEPS.map((step, i) => (
          <li key={step}>
            <button type="button" className="cv-ed-step" data-done={done[step] || undefined} aria-current={active === step ? 'step' : undefined} onClick={() => onStep(step)}>
              <span className="cv-ed-step-mark" aria-hidden="true">{done[step] ? '✓' : i + 1}</span>
              {t(STEP_LABEL[step])}
              {done[step] && <span className="sr-only"> ({t('editor.step.done')})</span>}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
