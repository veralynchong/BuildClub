import { t } from '../../lib/i18n'
import type { Key } from '../../lib/i18n'

const TOOLS = ['clips', 'text', 'captions', 'voice', 'music', 'brand'] as const
export type Tool = (typeof TOOLS)[number]

const LABEL: Record<Tool, Key> = {
  clips: 'editor.tab.clips',
  text: 'editor.tab.text',
  captions: 'editor.tab.captions',
  voice: 'editor.tab.voice',
  music: 'editor.tab.music',
  brand: 'editor.tab.brand',
}


// The tool tabs under the player. Arrow keys move between them.
export function ToolTabs({ tool, onTool }: { tool: Tool; onTool: (tool: Tool) => void }) {
  const move = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = TOOLS[(i + step + TOOLS.length) % TOOLS.length]
    onTool(next)
    document.getElementById(`cv-ed-tab-${next}`)?.focus()
  }
  return (
    <div className="cv-ed-tabs" role="tablist" aria-label={t('editor.tabs')}>
      {TOOLS.map((id, i) => (
        <button
          key={id}
          id={`cv-ed-tab-${id}`}
          type="button"
          role="tab"
          className="cv-ed-tab"
          aria-selected={tool === id}
          aria-controls={`cv-ed-panel-${id}`}
          tabIndex={tool === id ? 0 : -1}
          onClick={() => onTool(id)}
          onKeyDown={(e) => move(e, i)}
        >
          {t(LABEL[id])}
        </button>
      ))}
    </div>
  )
}
