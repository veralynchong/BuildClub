import { useEffect, useState } from 'react'
import { continueRender, delayRender } from 'remotion'

const loaded = new Set<string>()
const holds = new Map<string, number>() // the render hold of a font that is still loading
const started = new Set<string>()

// Loads Noto Sans TC from fontUrl. The render hold is taken while the component first renders (a useState
// initializer, not an effect), so no frame can be captured before the font is ready. Holds are kept per URL, so a
// second render pass or a component sharing the font never leaks one.
export function useReelFont(fontUrl: string): void {
  useState(() => {
    if (fontUrl && !loaded.has(fontUrl) && !holds.has(fontUrl)) holds.set(fontUrl, delayRender('Loading Noto Sans TC'))
    return null
  })
  useEffect(() => {
    if (!fontUrl || loaded.has(fontUrl) || started.has(fontUrl)) return
    started.add(fontUrl)
    const face = new FontFace('Noto Sans TC', `url(${fontUrl})`, { weight: '100 900' })
    face
      .load()
      .then(() => {
        document.fonts.add(face)
        loaded.add(fontUrl)
      })
      .catch((err) => console.error('Font failed to load', err))
      .finally(() => {
        started.delete(fontUrl)
        const hold = holds.get(fontUrl)
        holds.delete(fontUrl)
        if (hold !== undefined) continueRender(hold)
      })
  }, [fontUrl])
}
