import type { Footage } from '../types'
import { keepInPlan, mediaKind } from './shotBoard.ts'

// Files uploaded on the planning board. There is no upload route yet, so a big file is shown from an object URL
// that lives only while this browser tab is open; small images are also kept in the plan as a data URL.
const sessionUrls = new Map<string, string>()

// What to show for an upload: the copy kept in the plan, else this tab's copy. Undefined once both are gone.
export const footageSrc = (f: Footage): string | undefined => f.src ?? sessionUrls.get(f.key)

const newKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `f-${crypto.randomUUID()}`
    : `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// The footage record for one file, or null when it is not a photo or a video clip.
export async function footageFromFile(file: File): Promise<Footage | null> {
  const kind = mediaKind(file.type)
  if (!kind) return null
  const key = newKey()
  sessionUrls.set(key, URL.createObjectURL(file))
  if (keepInPlan(kind, file.size)) {
    try {
      return { key, kind, name: file.name, src: await readAsDataUrl(file) }
    } catch {
      // fall back to this device only
    }
  }
  return { key, kind, name: file.name, deviceOnly: true }
}
