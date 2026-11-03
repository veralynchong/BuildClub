import type { Format, SavedIdea, Video } from '../types'
import { t } from './i18n.ts'

// A plan whose video is not in the library any more (removed, or from another data set) still has to show and open.
// These stand in for the video and its format, built from what the plan itself holds; nothing here is a real video.
export const stubVideo = (idea: SavedIdea): Video => ({
  id: idea.videoId,
  platform: 'tiktok',
  handle: '',
  hook: t('home.plan.removedVideo'),
  views: 0,
  followers: 0,
  medianViews: null,
  daysAgo: 0,
  lengthSec: 0,
  shares: 0,
  saves: null,
  formatId: '',
  keywords: [],
})

export const stubFormat = (idea: SavedIdea): Format => ({
  id: '',
  name: t('home.plan.removedVideo'),
  short: '',
  tags: [],
  audiences: [],
  summary: '',
  why: { hook: '', first3s: '', length: '', format: '', sound: '' },
  shotList: idea.shots ?? [],
  props: [],
  needs: [],
  effort: 'medium',
  editorNotes: '',
})

export const videoOf = (idea: SavedIdea, videoById: Map<string, Video>): Video => videoById.get(idea.videoId) ?? stubVideo(idea)

export const formatOf = (idea: SavedIdea, video: Video, formatById: Map<string, Format>): Format =>
  formatById.get(video.formatId) ?? stubFormat(idea)
