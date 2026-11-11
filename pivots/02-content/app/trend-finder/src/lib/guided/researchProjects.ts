import { sampleResearch, sampleResearchSlots } from '../../data/sampleResearch.ts'
import type { ResearchEntry, ResearchSlot } from '../research.ts'
import { GUIDED_IDS } from './contracts.ts'

export function preparedResearchProjects(local: Storage, rows: ResearchEntry[], slots: ResearchSlot[]) {
  const nativeSlots = sampleResearchSlots.filter(slot => slot.clientId === 'evergreen')
  const slotIds = new Map(nativeSlots.map(slot => [slot.id, slot.number === 1 ? GUIDED_IDS.slotId : `${GUIDED_IDS.clientId}-slot-${slot.number}`]))
  const extraSlots = nativeSlots.filter(slot => slot.number !== 1).map(slot => ({ ...slot, id: slotIds.get(slot.id)!, clientId: GUIDED_IDS.clientId }))
  const extraRows = sampleResearch.filter(row => row.clientId === 'evergreen').map(row => ({ ...row, id: `${GUIDED_IDS.clientId}-project-${row.videoId}`, clientId: GUIDED_IDS.clientId, slotId: slotIds.get(row.slotId!) }))
  const marker = 'prepared-projects.v1'
  if (!local.getItem(marker)) {
    for (const [key, additions] of [['trend-finder.research.v4', extraRows], ['trend-finder.research-slots.v2', extraSlots]] as const) {
      const raw = local.getItem(key)
      if (raw) {
        try {
          const saved = JSON.parse(raw) as { id: string; clientId?: string; videoId?: string }[]
          if (Array.isArray(saved)) local.setItem(key, JSON.stringify([...saved, ...additions.filter(item => !saved.some(old => old.id === item.id || 'videoId' in item && old.clientId === item.clientId && old.videoId === item.videoId))]))
        } catch { /* The native store owns malformed-data recovery. */ }
      }
    }
    local.setItem(marker, 'true')
  }
  return { rows: [...rows, ...extraRows], slots: [...slots, ...extraSlots] }
}
