import { useMemo, type CSSProperties } from 'react'
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile } from 'remotion'
import { pageEnd, projectPages } from '../lib/editor/captions.ts'
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

// Captions: 56 px, white with a black outline, centred in the same column, the bottom edge at y = 1460.
const CAPTION_BOX: CSSProperties = { position: 'absolute', left: 70, width: 940, bottom: 1920 - 1460, textAlign: 'center', overflowWrap: 'anywhere' }

// White and brand-colour text get a black outline; black text gets a white one (F25).
function textLook(color: TextItem['color'], brand: string | null): { fill: string; stroke: string } {
  if (color === 'black') return { fill: '#000000', stroke: '#ffffff' }
  if (color === 'brand' && brand) return { fill: brand, stroke: '#000000' }
  return { fill: '#ffffff', stroke: '#000000' }
}

export function Reel(props: ReelInput) {
  const { project, urls, fontUrl, brand, musicUrl, lines, voice } = props
  useReelFont(fontUrl || staticFile(BUNDLED_FONT))
  const spans = clipFrames(project)
  const total = reelDurationInFrames(project)
  const pages = useMemo(() => {
    const words = Object.fromEntries(voice.flatMap((v) => (v.words ? [[v.id, v.words]] : [])))
    return projectPages(project, lines, words)
  }, [project, lines, voice])
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
      {pages.map((pg, i) => {
        const from = toFrames(pg.startMs / 1000)
        if (from >= total) return null
        const duration = Math.max(1, Math.min(toFrames(pageEnd(pg) / 1000), total) - from)
        return (
          <Sequence key={i} from={from} durationInFrames={duration} layout="none">
            <div style={CAPTION_BOX}>
              <span
                style={{
                  fontFamily: family, fontSize: 56, fontWeight: 700, lineHeight: 1.25, whiteSpace: 'pre-wrap',
                  color: '#ffffff', WebkitTextStroke: '4px #000000', paintOrder: 'stroke fill',
                }}
              >
                {pg.text}
              </span>
            </div>
          </Sequence>
        )
      })}
      {project.showLogo && brand.logoUrl ? (
        <Img src={brand.logoUrl} style={{ position: 'absolute', top: 48, right: 48, width: 180, height: 'auto' }} />
      ) : null}
      {project.voiceover.map((seg) => {
        const file = voice.find((v) => v.id === seg.id)
        if (!file || toFrames(seg.start) >= total) return null
        return (
          <Sequence key={seg.id} from={toFrames(seg.start)} layout="none">
            <Audio src={file.url} volume={seg.volume} />
          </Sequence>
        )
      })}
      {project.music && musicUrl ? <Audio src={musicUrl} volume={project.music.volume} loop={false} /> : null}
    </AbsoluteFill>
  )
}
