import type { Shot } from '../../types'
import { t } from '../../lib/i18n'

// "Shot 3" when the footage belongs to a shot of the plan, else a generic name.
export function clipName(source: { shotId?: string }, shots: Shot[]): string {
  const i = source.shotId ? shots.findIndex((s) => s.id === source.shotId) : -1
  return i >= 0 ? t('editor.clip.shot', { n: i + 1 }) : t('editor.clip.generic')
}
