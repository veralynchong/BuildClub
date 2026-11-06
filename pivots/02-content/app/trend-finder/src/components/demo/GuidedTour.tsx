import { useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { canvasProgress, canvasStepFor } from '../../lib/guided/canvasTour'
import { GUIDED_STEPS, guidedMainProgress } from '../../lib/guided/tour'
import type { GuidedRoute, GuidedState } from '../../lib/guided/contracts'
import './guided-tour.css'

export type GuidedTourProps = {
  state: GuidedState
  lang: 'en' | 'zh-Hant'
  busy: boolean
  error?: string
  canContinue?: boolean
  onSkip?: () => void
  onNext: () => void
  onPrevious: () => void
  onReset: () => void
  onExit: () => void
  onRoute: (route: GuidedRoute) => void
}

function boundedPosition(left: number, top: number, size: { width: number; height: number }) {
  return {
    left: Math.max(8, Math.min(left, window.innerWidth - size.width - 8)),
    top: Math.max(8, Math.min(top, window.innerHeight - size.height - 8)),
  }
}

export function GuidedTour({ state, lang, busy, error, canContinue = true, onSkip, onNext, onPrevious, onReset, onExit, onRoute }: GuidedTourProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const card = useRef<HTMLElement>(null)
  const drag = useRef<{ id: number; x: number; y: number } | null>(null)
  useLayoutEffect(() => {
    if (!state.active || !card.current) return
    const fit = () => {
      if (!card.current) return
      const rect = card.current.getBoundingClientRect()
      const next = boundedPosition(rect.left, rect.top, rect)
      if (Math.abs(next.left - rect.left) > 0.1 || Math.abs(next.top - rect.top) > 0.1) setPosition(next)
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(card.current)
    window.addEventListener('resize', fit)
    return () => { observer.disconnect(); window.removeEventListener('resize', fit); drag.current = null }
  }, [collapsed, state.active])
  const moveTo = (left: number, top: number) => {
    if (card.current) setPosition(boundedPosition(left, top, card.current.getBoundingClientRect()))
  }
  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !card.current) return
    const rect = card.current.getBoundingClientRect()
    drag.current = { id: event.pointerId, x: event.clientX - rect.left, y: event.clientY - rect.top }
    event.preventDefault()
    event.currentTarget.focus()
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const finishDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (drag.current?.id !== event.pointerId) return
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const moveWithKeys = (event: KeyboardEvent<HTMLButtonElement>) => {
    const delta = ({ ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] } as Record<string, number[]>)[event.key]
    if (!delta || !card.current) return
    event.preventDefault()
    const rect = card.current.getBoundingClientRect()
    moveTo(rect.left + delta[0], rect.top + delta[1])
  }
  if (!state.active) return null
  const index = GUIDED_STEPS.findIndex(step => step.id === state.stepId)
  const { current, total } = guidedMainProgress(state.stepId)
  const canvasStep = canvasStepFor(state)
  const canvasCount = canvasProgress(state)
  const step = (canvasStep ?? GUIDED_STEPS[index])[lang]
  const zh = lang === 'zh-Hant'
  const text = (en: string, hant: string) => zh ? hant : en
  const nextDisabled = busy || index === GUIDED_STEPS.length - 1 || (state.stepId === 'route' && state.route === null) || (!!canvasStep?.generation && !canContinue)

  return <aside ref={card} style={position ? { ...position, right: 'auto' } : undefined} className="guided-tour" aria-label={text('Guided demo', '示範導覽')} data-testid="guided-tour" data-collapsed={collapsed}>
    <header className="guided-tour__header">
      <button type="button" className="guided-tour__button guided-tour__drag" aria-label={text('Drag guide; use arrow keys to move', '拖曳導覽；或使用方向鍵移動')} title={text('Drag to reposition', '拖曳以調整位置')} aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown" onPointerDown={startDrag} onPointerMove={event => { if (drag.current?.id === event.pointerId) moveTo(event.clientX - drag.current.x, event.clientY - drag.current.y) }} onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={() => { drag.current = null }} onKeyDown={moveWithKeys}>
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true"><circle cx="3" cy="3" r="1" /><circle cx="9" cy="3" r="1" /><circle cx="3" cy="8" r="1" /><circle cx="9" cy="8" r="1" /><circle cx="3" cy="13" r="1" /><circle cx="9" cy="13" r="1" /></svg>
      </button>
      <span className="guided-tour__eyebrow">{text('Prepared demo', '預備示範')}</span>
      <span className="guided-tour__count">{current}/{total}</span>
      <button type="button" className="guided-tour__button guided-tour__collapse" aria-label={collapsed ? text('Expand guide', '展開導覽') : text('Collapse guide', '收合導覽')} aria-expanded={!collapsed} aria-controls="guided-tour-details" onClick={() => setCollapsed(value => !value)}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d={collapsed ? 'm4 6 4 4 4-4' : 'm4 10 4-4 4 4'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </header>
    <div id="guided-tour-details" hidden={collapsed}>
    <div className="guided-tour__heading" aria-live="polite" aria-atomic="true">
      {canvasCount && <span className="guided-tour__canvas-count">{text('Canvas', '畫布')} {canvasCount.current}/{canvasCount.total}</span>}
      <strong className="guided-tour__title">{step.title}</strong>
      {busy && <span className="guided-tour__status">{text('Opening…', '正在開啟…')}</span>}
    </div>
    <div className="guided-tour__progress" role="progressbar" aria-label={text('Guide progress', '導覽進度')} aria-valuemin={0} aria-valuemax={total} aria-valuenow={current}>
      <span style={{ width: `${current / total * 100}%` }} />
    </div>
    <div>
      <p className="guided-tour__description">{step.description}</p>
      {state.route && ['canvas', 'edit', 'result'].includes(state.stepId) && <p className="guided-tour__provenance">{state.route === 'ai'
        ? text('Prepared AI images and motion · no live generation. Local editing and export are real.', '預備 AI 圖像與動態 · 無即時生成。本機剪輯與匯出會實際執行。')
        : text('Six-shot shoot plan · source-derived storyboard references, not filmed footage.', '六鏡拍攝計畫 · 原片衍生分鏡參考，並非實拍素材。')}</p>}
      {state.stepId === 'route' && <div className="guided-tour__routes" role="group" aria-label={text('Production route', '製作路線')}>
        <button type="button" className="guided-tour__button guided-tour__route" disabled={busy} aria-pressed={state.route === 'shoot'} onClick={() => onRoute('shoot')}>{text('Plan a shoot', '規劃拍攝')}</button>
        <button type="button" className="guided-tour__button guided-tour__route" disabled={busy} aria-pressed={state.route === 'ai'} onClick={() => onRoute('ai')}>{text('Create an AI ad', '製作 AI 廣告')}</button>
      </div>}
    </div>
    {error && <p className="guided-tour__error" role="alert">{error}</p>}
    <div className="guided-tour__navigation">
      <button type="button" className="guided-tour__button guided-tour__previous" disabled={busy || index === 0} onClick={onPrevious}>{text('Previous', '上一步')}</button>
      <button type="button" className="guided-tour__button guided-tour__next" disabled={nextDisabled} onClick={onNext}>{text('Next', '下一步')}</button>
    </div>
    {canvasStep?.generation && onSkip && <button type="button" className="guided-tour__button guided-tour__skip" disabled={busy} onClick={onSkip}>{text('Skip this replay', '跳過這次回放')}</button>}
    <footer className="guided-tour__footer">
      <button type="button" className="guided-tour__button guided-tour__quiet" disabled={busy} onClick={onReset}>{text('Restart guide', '重新導覽')}</button>
      <button type="button" className="guided-tour__button guided-tour__quiet" disabled={busy} onClick={onExit}>{text('Exit guide', '退出導覽')}</button>
    </footer>
    </div>
  </aside>
}
