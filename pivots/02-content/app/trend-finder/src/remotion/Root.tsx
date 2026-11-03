import { Composition } from 'remotion'
import { reelDurationInFrames } from '../lib/editor/timeline.ts'
import type { ReelInput } from '../lib/editor/types.ts'
import { Reel } from './Reel.tsx'

const EMPTY: ReelInput = {
  project: {
    fps: 30, width: 1080, height: 1920, clips: [], texts: [], captions: { enabled: false },
    music: null, voiceover: [], primaries: {}, showLogo: false, logoSize: 'medium', logoCorner: 'top-right',
  },
  urls: {},
  lines: {},
  musicUrl: null,
  voice: [],
  brand: { font: 'Noto Sans TC', color: null, logoUrl: null },
  fontUrl: '',
}

export function Root() {
  return (
    <Composition
      id="Reel"
      component={Reel}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={1}
      calculateMetadata={({ props }) => ({ durationInFrames: reelDurationInFrames(props.project) })}
      defaultProps={EMPTY}
    />
  )
}
