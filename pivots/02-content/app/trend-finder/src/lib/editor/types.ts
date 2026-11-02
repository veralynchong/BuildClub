// Shapes of the edit project. They match backend/editing.py (empty_project, check_project, list_sources).

export type ClipSource = {
  kind: 'generation' | 'take'
  id: string
  nodeId?: string
  shotId?: string
}

export type Clip = {
  id: string
  source: ClipSource
  in: number
  out: number
  volume: number
  muted: boolean
  caption?: string
}

export type TextPosition = 'top' | 'middle' | 'bottom'
export type TextColor = 'brand' | 'white' | 'black'

export type TextItem = {
  id: string
  text: string
  start: number
  end: number
  position: TextPosition
  color: TextColor
}

// The music file is the plan's cut music; the project keeps only how loud it plays (0 to 1).
export type MusicSetting = { volume: number }

export type VoiceSeg = {
  id: string
  source: 'tts' | 'recording' | 'upload'
  start: number // seconds on the timeline
  volume: number // 0 to 2
  edits: Record<string, string> // page index (within this voiceover) to the text shown instead
}

export type EditProject = {
  fps: 30
  width: 1080
  height: 1920
  clips: Clip[]
  texts: TextItem[]
  captions: { enabled: boolean }
  music: MusicSetting | null
  voiceover: VoiceSeg[]
  primaries: Record<string, ClipSource>
  showLogo: boolean
}

// One footage item from list_sources, without the backend-only `path`.
export type SourceInfo = {
  key: string
  kind: 'generation' | 'take'
  id: string
  url: string
  duration: number
  hasAudio: boolean
  width: number
  height: number
  nodeId?: string
  shotId?: string
}

export type Word = { text: string; start: number; end: number }

export type ReelInput = {
  project: EditProject
  urls: Record<string, string>
  lines: Record<string, string>
  musicUrl: string | null
  voice: { id: string; url: string; words: Word[] | null }[]
  brand: { font: string; color: string | null; logoUrl: string | null }
  fontUrl: string
}
