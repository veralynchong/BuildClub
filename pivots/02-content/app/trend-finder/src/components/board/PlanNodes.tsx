import { Handle, Position, type NodeProps } from '@xyflow/react'
import { t } from '../../lib/i18n'
import { emotionKey } from '../../lib/hookEmotion'
import { purposeLabel } from '../../lib/storyboard'
import type { HooksFlowNode, ScriptFlowNode } from './boardContext'

// Every suggested hook with what the viewer feels; the picked one has the blue ring. It leads into shot 1.
export function HooksNode({ data }: NodeProps<HooksFlowNode>) {
  return (
    <article className="board-node board-hooks" aria-labelledby="board-hooks-title">
      <header className="board-node-head">
        <span className="sb-purpose is-hook">{purposeLabel('hook')}</span>
        <h2 id="board-hooks-title" className="board-node-title">
          {t('board.hooks.title')}
        </h2>
      </header>
      <ul className="board-hook-list">
        {data.hooks.map((h) => (
          <li key={h.text} className={`board-hook${h.picked ? ' is-picked' : ''}`}>
            <div className="board-hook-head">
              {h.own ? (
                <span className="hook-emo hook-own-tag">{t('board.hooks.own')}</span>
              ) : (
                <span className={`hook-emo emo-${h.emotion}`}>
                  <span className="sr-only">{t('plan.hooks.emotionLead')}</span>
                  {t(emotionKey(h.emotion))}
                </span>
              )}
              {h.picked && <span className="board-hook-picked">{t('plan.hooks.picked')}</span>}
            </div>
            <p className="board-hook-text">{h.text}</p>
          </li>
        ))}
      </ul>
      <Handle type="source" position={Position.Right} isConnectable={false} className="board-handle" />
    </article>
  )
}

// The plan's script, one line per shot. It is written and edited on the plan page.
export function ScriptNode({ data }: NodeProps<ScriptFlowNode>) {
  const { script, stale } = data
  return (
    <article className="board-node board-script" aria-labelledby="board-script-title">
      <header className="board-node-head">
        <h2 id="board-script-title" className="board-node-title">
          {t('plan.script.title')}
        </h2>
      </header>
      {!script ? (
        <p className="board-node-line">{t('board.script.none')}</p>
      ) : (
        <>
          {stale && <p className="board-node-line">{t('board.script.stale')}</p>}
          <ol className="board-script-list">
            {script.lines.map((l, i) => (
              <li key={i} aria-label={t('board.node.label', { n: i + 1 })}>
                <span className="sb-no">{i + 1}</span>
                <div>
                  {l.say && <p className="board-node-shot">{l.say}</p>}
                  {l.onScreen && <p className="board-node-line">{t('board.node.onScreen', { text: l.onScreen })}</p>}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </article>
  )
}
