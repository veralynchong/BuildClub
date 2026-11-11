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
  fit?: ClipFit // how the footage sits in the 9:16 frame; absent means 'fill'
}

// 'fill' crops the video to cover the frame; 'fit' shows all of it over a blurred copy of itself.
export type ClipFit = 'fill' | 'fit'

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

// The music file is the plan's cut music; the project keeps how loud it plays (0 to 1) and whether it goes down under speech
// (absent means it does).
export type MusicSetting = { volume: number; duck?: boolean }

// The export popover's choices. Absent means TikTok with the loudness pass on. The platform only changes the warnings shown.
export type ExportPreset = 'tiktok' | 'reels' | 'shorts'
export type ExportSettings = { preset: ExportPreset; loudnorm: boolean }

export type VoiceSeg = {
  id: string
  source: 'tts' | 'recording' | 'upload'
  start: number // seconds on the timeline
  volume: number // 0 to 2
  edits: Record<string, string> // page index (within this voiceover) to the text shown instead
}

export type LogoSize = 'small' | 'medium' | 'large'
export type LogoCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

// Where the captions come from: the shots' lines (or the voiceover's words), or lines made from the speech in the takes.
export type CaptionSource = 'lines' | 'speech'

// One word of a speech caption line, on the timeline (seconds). `key` names the take word it came from ("<take>:<ms>").
export type CaptionWord = { text: string; start: number; end: number; key?: string }

// One caption line made from speech, on the timeline (seconds). Its text can be edited. `words` (absent on lines made
// before word timing existed) gives each word its own time while the text still reads the same as the words.
export type SpeechCaption = { id: string; start: number; end: number; text: string; words?: CaptionWord[] }

export type Captions = {
  enabled: boolean
  source?: CaptionSource // absent means the shots' lines, or the voiceover when there is one
  speech?: SpeechCaption[]
  speechKey?: string // which clips the speech lines were made for, to tell when the timeline has changed since
}

export type EditProject = {
  fps: 30
  width: 1080
  height: 1920
  clips: Clip[]
  texts: TextItem[]
  captions: Captions
  music: MusicSetting | null
  voiceover: VoiceSeg[]
  primaries: Record<string, ClipSource>
  showLogo: boolean
  logoSize: LogoSize // the backend fills these in for a project saved without them
  logoCorner: LogoCorner
  export?: ExportSettings
  transcriptFixes?: Record<string, string> // words corrected in the transcript: a take word's key to the text shown instead
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
  duck?: [number, number][] // timeline seconds in which the music goes down (speech); empty or absent: it stays level
  voice: { id: string; url: string; words: Word[] | null }[]
  brand: { font: string; color: string | null; logoUrl: string | null }
  fontUrl: string
  hideVideo?: boolean // the editor's preview with the video track hidden: the footage is not drawn (its sound still plays)
}
