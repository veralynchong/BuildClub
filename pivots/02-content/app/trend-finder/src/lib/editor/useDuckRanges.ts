import { useEffect, useMemo, useState } from 'react'
import { getDuckRanges } from './aiApi.ts'
import type { EditProject } from './types.ts'

// Where the music goes down in the player: the server works the speech ranges out from what it stored for each take (the
// export does the same). Asked again shortly after the clips change; `again` changes when a take finishes being analysed.
export function useDuckRanges(planId: string | null, project: EditProject | null, on: boolean, again: string): [number, number][] {
  const [ranges, setRanges] = useState<[number, number][]>([])
  const key = useMemo(
    () => (project ? JSON.stringify([project.clips.map((c) => [c.source.kind, c.source.id, c.in, c.out, c.volume, c.muted]), project.voiceover.map((v) => [v.id, v.start])]) : ''),
    [project],
  )
  useEffect(() => {
    const live = on && planId && project && project.clips.length > 0
    if (!live) {
      setRanges((r) => (r.length ? [] : r))
      return
    }
    let stop = false
    const id = setTimeout(() => {
      getDuckRanges(planId, project).then(
        (r) => { if (!stop) setRanges(r) },
        () => { if (!stop) setRanges([]) }, // no ducking in the preview; the export still decides for itself
      )
    }, 400)
    return () => { stop = true; clearTimeout(id) }
    // The project itself changes on every edit; only the clips and voiceover matter, and `key` stands for them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, on, key, again])
  return ranges
}
