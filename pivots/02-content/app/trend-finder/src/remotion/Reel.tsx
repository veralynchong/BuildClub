import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from 'remotion'
import { clipFrames, sourceKey, toFrames } from '../lib/editor/timeline.ts'
import type { ReelInput } from '../lib/editor/types.ts'
import { useReelFont } from './font.ts'

// The server render passes an empty fontUrl; the bundle then serves the font from its own public folder.
const BUNDLED_FONT = 'fonts/NotoSansTC-VF.ttf'

export function Reel(props: ReelInput) {
  const { project, urls, fontUrl } = props
  useReelFont(fontUrl || staticFile(BUNDLED_FONT))
  const spans = clipFrames(project)
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
    </AbsoluteFill>
  )
}
