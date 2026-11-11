// Sample descriptions paired with existing clips; these are not new provider runs.
export const OPENING_MODEL = 'prepared-opening-video'
export const OPENING_NODE = 'n_six_video_s1'
export const OPENING_PREFIX = 'Reveal silken tofu in a bowl. '
export const OPENING_VERSIONS = [
  { change: 'Close-up framing on the tofu and hands.', sourceId: 'shoot-s1-motion-a', url: '/demo-assets/fresh-six/opening-a.mp4', poster: '/demo-assets/fresh-six/opening-a.png' },
  { change: 'Wider framing to include the warm kitchen.', sourceId: 'shoot-s1-motion-b', url: '/demo-assets/fresh-six/opening-b.mp4', poster: '/demo-assets/fresh-six/opening-b.png' },
].map(version => ({ ...version, prompt: OPENING_PREFIX + version.change }))
export const openingVersion = (prompt: string | undefined) => OPENING_VERSIONS.find(version => version.prompt === prompt?.trim())

export const OPENING_IMAGES = ['/demo-assets/batch-20261106/images/S01.jpg', '/demo-assets/fresh-six/ai-s1-parent.png'] as const
