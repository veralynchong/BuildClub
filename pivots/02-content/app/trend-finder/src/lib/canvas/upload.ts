import { t, type Key } from '../i18n.ts'
import { videoType } from '../takes.ts'

// Same types and limit as backend/generations.py.
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

// The upload's Content-Type. Some browsers leave file.type empty, so the extension decides then.
export function imageType(file: { name: string; type: string }): string | null {
  if (IMAGE_TYPES.includes(file.type)) return file.type
  if (file.type) return null
  const ext = file.name.toLowerCase().split('.').pop()
  return ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : null
}

// What an upload node does with a file.
export function uploadKind(file: { name: string; type: string }): 'image' | 'video' | null {
  return imageType(file) ? 'image' : videoType(file) ? 'video' : null
}

// The reason an image can't be uploaded, or null when it can.
export function checkImage(file: { name: string; type: string; size: number }, maxBytes = MAX_IMAGE_BYTES): Key | null {
  if (!imageType(file)) return 'canvas.err.upload'
  return file.size > maxBytes ? 'canvas.upload.tooBig' : null
}

export const imageError = (file: { name: string; type: string; size: number }): string | null => {
  const key = checkImage(file)
  return key ? t(key) : null
}
