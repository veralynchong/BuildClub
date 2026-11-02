import type { CSSProperties } from 'react'
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile } from 'remotion'
import { clipFrames, reelDurationInFrames, sourceKey, toFrames } from '../lib/editor/timeline.ts'
import type { ReelInput, TextItem } from '../lib/editor/types.ts'
import { useReelFont } from './font.ts'

// The server render passes an empty fontUrl; the bundle then serves the font from its own public folder.
const BUNDLED_FONT = 'fonts/NotoSansTC-VF.ttf'

// Text sits in a 940 px column. Top texts start 220 px from the top, bottom texts end at y = 1300, middle texts
// are centred. The video is 1080 x 1920.
const TEXT_BOX: CSSProperties = { position: 'absolute', left: 70, width: 940, textAlign: 'center', overflowWrap: 'anywhere' }
const POSITION: Record<TextItem['position'], CSSProperties> = {
  top: { top: 220 },
  middle: { top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  bottom: { bottom: 1920 - 1300 },
}

// White and brand-colour text get a black outline; black text gets a white one (F25).
function textLook(color: TextItem['color'], brand: string | null): { fill: string; stroke: string } {
  if (color === 'black') return { fill: '#000000', stroke: '#ffffff' }
  if (color === 'brand' && brand) return { fill: brand, stroke: '#000000' }
  return { fill: '#ffffff', stroke: '#000000' }
}

export function Reel(props: ReelInput) {
  const { project, urls, fontUrl, brand, musicUrl } = props
  useReelFont(fontUrl || staticFile(BUNDLED_FONT))
  const spans = clipFrames(project)
  const total = reelDurationInFrames(project)
  const family = `'${brand.font || 'Noto Sans TC'}', sans-serif`
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {project.clips.map((c, i) => {
        const src = urls[sourceKey(c.source)]
        return (
          <Sequence key={c.id} from={spans[i].from} durationInFrames={spans[i].duration} premountFor={30}>
            {src ? (
              <OffthreadVideo
                src={src}
                trimBefore={toFrames(c.in)}
                volume={c.muted ? 0 : c.volume}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : null}
          </Sequence>
        )
      })}
      {project.texts.map((x) => {
        const from = Math.min(toFrames(x.start), total - 1)
        const duration = Math.min(toFrames(x.end), total) - from
        if (duration < 1) return null
        const look = textLook(x.color, brand.color)
        return (
          <Sequence key={x.id} from={from} durationInFrames={duration} layout="none">
            <div style={{ ...TEXT_BOX, ...POSITION[x.position] }}>
              <span
                style={{
                  fontFamily: family, fontSize: 96, fontWeight: 700, lineHeight: 1.25, whiteSpace: 'pre-wrap',
                  color: look.fill, WebkitTextStroke: `6px ${look.stroke}`, paintOrder: 'stroke fill',
                }}
              >
                {x.text}
              </span>
            </div>
          </Sequence>
        )
      })}
      {project.showLogo && brand.logoUrl ? (
        <Img src={brand.logoUrl} style={{ position: 'absolute', top: 48, right: 48, width: 180, height: 'auto' }} />
      ) : null}
      {project.music && musicUrl ? <Audio src={musicUrl} volume={project.music.volume} loop={false} /> : null}
    </AbsoluteFill>
  )
}
