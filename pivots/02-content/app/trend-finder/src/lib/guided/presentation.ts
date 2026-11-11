import type { Video } from '../../types.ts'
import type { ResearchEntry } from '../research.ts'
import { GUIDED_IDS } from './contracts.ts'

// Product demo presentation only; never used for billing or provider receipts.
export const preparedMetrics = { views: 248600, followers: 18400, medianViews: 32600, shares: 2840, saves: 6120, daysAgo: 7 }
export const preparedWallet = { image: { cap: 25, spent: 3.2 }, video: { cap: 50, spent: 12.4 }, voice: { cap: 10, spent: 1.2 } }
export const preparedCost = { image: 0.04, video: 0.20, voice: 0.08 }
export const presentPreparedVideo = (video: Video): Video => video.id === GUIDED_IDS.videoId ? { ...video, ...preparedMetrics } : video
export const presentPreparedResearch = (row: ResearchEntry): ResearchEntry => row.videoId === GUIDED_IDS.videoId && row.followers === 0 && row.views === 0 ? { ...row, followers: preparedMetrics.followers, views: preparedMetrics.views } : row
