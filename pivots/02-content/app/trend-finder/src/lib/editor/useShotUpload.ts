import { useCallback, useRef, useState } from 'react'
import { checkFile, listTakes, uploadTake, type Take } from '../takes.ts'
import { t } from '../i18n.ts'

export interface UploadItem {
  id: number
  name: string
  status: 'waiting' | 'uploading' | 'failed'
  error?: string // why it failed, the backend's own sentence when it gave one
}

export interface ShotUpload {
  items: Record<number, UploadItem[]> // per shot index: files being sent, and the ones that failed
  upload: (shot: number, files: File[]) => void
  dismiss: (shot: number, id: number) => void
}

// Sends footage for one shot, one file at a time, each becoming a take. After every file the footage is read again
// (`refresh`) and the plan's takes are handed to `onTakes`, so the new take shows in the shot list at once.
export function useShotUpload(ideaId: string | null, refresh: () => Promise<unknown>, onTakes: (takes: Take[]) => void): ShotUpload {
  const [items, setItems] = useState<Record<number, UploadItem[]>>({})
  const next = useRef(0)
  const queue = useRef(Promise.resolve())

  const patch = useCallback((shot: number, id: number, change: Partial<UploadItem> | null) => {
    setItems((all) => {
      const rest = (all[shot] ?? []).flatMap((x) => (x.id !== id ? [x] : change ? [{ ...x, ...change }] : []))
      return { ...all, [shot]: rest }
    })
  }, [])

  const upload = useCallback(
    (shot: number, files: File[]) => {
      if (!ideaId) return
      const mine = files.map((file) => ({ file, id: next.current++ }))
      setItems((all) => ({ ...all, [shot]: [...(all[shot] ?? []), ...mine.map(({ file, id }) => ({ id, name: file.name, status: 'waiting' as const }))] }))
      for (const { file, id } of mine) {
        queue.current = queue.current.then(async () => {
          const problem = checkFile(file)
          if (problem) return patch(shot, id, { status: 'failed', error: problem })
          patch(shot, id, { status: 'uploading' })
          try {
            await uploadTake(ideaId, shot, file)
            patch(shot, id, null)
          } catch (e) {
            return patch(shot, id, { status: 'failed', error: e instanceof Error ? e.message : t('plan.takes.err.upload') })
          }
          await Promise.all([refresh(), listTakes(ideaId).then(onTakes)]).catch(() => undefined)
        })
      }
    },
    [ideaId, refresh, onTakes, patch],
  )

  const dismiss = useCallback((shot: number, id: number) => patch(shot, id, null), [patch])
  return { items, upload, dismiss }
}
