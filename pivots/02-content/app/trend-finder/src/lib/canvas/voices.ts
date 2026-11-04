import type { CanvasDoc } from './types.ts'
import type { VoiceInfo } from '../editor/api.ts'

// Legacy voice DTOs have no owner fields. Only explicit canvas ownership is added;
// pre-existing editor-owned audio stays unassigned.
export function mergeVoiceOwnership(doc: CanvasDoc, voices: VoiceInfo[]): VoiceInfo[] {
  return voices.map((voice) => {
    if (voice.nodeId) return voice
    const owner = doc.nodes.find((n) => n.data.voiceId === voice.id || n.data.voiceIds?.includes(voice.id) || Object.values(n.data.voiceSources ?? {}).includes(voice.id))
    if (!owner) return voice
    const genId = Object.entries(owner.data.voiceSources ?? {}).find(([, id]) => id === voice.id)?.[0]
      ?? (owner.type === 'voice' && owner.data.voiceId === voice.id ? owner.data.selected : undefined)
    return { ...voice, nodeId: owner.id, ...(genId ? { genId } : {}) }
  })
}
