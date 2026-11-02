import { useEffect } from 'react'
import { continueRender, delayRender } from 'remotion'

const loaded = new Set<string>()

// Loads Noto Sans TC from fontUrl and holds the render until it is ready.
export function useReelFont(fontUrl: string): void {
  useEffect(() => {
    if (!fontUrl || loaded.has(fontUrl)) return
    const handle = delayRender('Loading Noto Sans TC')
    const face = new FontFace('Noto Sans TC', `url(${fontUrl})`, { weight: '100 900' })
    face
      .load()
      .then(() => {
        document.fonts.add(face)
        loaded.add(fontUrl)
      })
      .catch((err) => console.error('Font failed to load', err))
      .finally(() => continueRender(handle))
  }, [fontUrl])
}
