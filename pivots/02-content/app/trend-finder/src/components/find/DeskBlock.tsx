import type { ReactNode } from 'react'

// A numbered blueprint block (find-desk.css): a mono tab on top ("01. Recent searches") and a hairline box
// with small corner marks. Used for every area of Find ideas, before and after searching.
export function DeskBlock({
  tab,
  id,
  quiet,
  hideTab,
  className = '',
  children,
}: {
  tab: string
  // The tab names the block for screen readers.
  id: string
  // Grey tab: an empty block that will fill in later.
  quiet?: boolean
  // Keep the tab for screen readers only (the block's own heading already says it).
  hideTab?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`fd-block ${className}`} aria-labelledby={id}>
      <h2 className={hideTab ? 'sr-only' : `fd-tab ${quiet ? 'fd-tab-quiet' : ''}`} id={id}>
        {tab}
      </h2>
      <div className="fd-box">{children}</div>
    </section>
  )
}

// A tiny 9:16 cover: the video's own picture when there is one, else the navy dot pattern.
export function MiniCover({ src, ghost }: { src?: string; ghost?: boolean }) {
  return (
    <span className={`fd-mc ${ghost ? 'fd-mc-ghost' : ''}`} aria-hidden="true">
      {src && <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => e.currentTarget.remove()} />}
    </span>
  )
}
