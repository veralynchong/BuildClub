import { preparedFixtures, preparedAt } from './fixtures.ts'
import { GUIDED_IDS } from './contracts.ts'
import { tofuCase } from '../demo/tofuCase.ts'
import type { CanvasDoc } from '../canvas/types.ts'
import type { Shot } from '../../types.ts'

const beats = [
  ['Tofu reveal', '豆腐開場', 1, 0, 1.60, 'Turn silken tofu into something crispy.'],
  ['Add ingredients', '加入食材', 3, 1.60, 3.23, 'Add the ingredients.'],
  ['Mix together', '混合準備', 11, 3.23, 5.13, 'Mix it all together.'],
  ['Into the pan', '入鍋煎製', 12, 5.13, 6.63, 'Shape and pan-fry.'],
  ['The finished dish', '成品特寫', 19, 6.63, 9.77, 'Crispy outside. Silken inside.'],
  ['Product reveal', '產品 CTA', 20, 9.77, 10.50, 'Make it with Ever Green silken tofu.'],
] as const
export const SIX_SHOTS = beats.map(([title, zh, source, start, end, copy], i) => {
  const asset = tofuCase.assets.find(a => a.id === `image-s${source}`)!
  return { id: `s${i + 1}` as `s${number}`, title, zh, source, start, end, copy, asset,
    prompt: `${tofuCase.shots[source - 1].action} Adapted on-screen copy: ${copy} Prepared source-derived storyboard reference; not fresh AI generation.`,
    nodes: { shot: `n_shot_s${i + 1}`, prompt: `n_six_prompt_s${i + 1}`, image: `n_six_image_s${i + 1}` },
  }
})

export function sixShotTemplate(): CanvasDoc {
  return {
    nodes: SIX_SHOTS.flatMap((s, i) => [
      { id: s.nodes.shot, type: 'shot' as const, shotId: s.id, position: { x: i * 1100, y: 0 }, data: {} },
      { id: s.nodes.prompt, type: 'prompt' as const, shotId: s.id, position: { x: i * 1100, y: 250 }, data: { text: s.prompt } },
      { id: s.nodes.image, type: 'storyboard' as const, shotId: s.id, position: { x: i * 1100 + 420, y: 250 }, data: { primary: true, model: 'prepared-image', selected: null } },
    ]),
    edges: SIX_SHOTS.map(s => ({ id: `six-${s.id}-prompt-image`, source: s.nodes.prompt, sourceHandle: 'out', target: s.nodes.image, targetHandle: 'in:text' })),
    viewport: { x: 0, y: 0, zoom: 0.8 },
  }
}

// Only guide focus actions expand the graph; no output nodes are present initially.
export function materializeSixShot(doc: CanvasDoc, nodeIds: readonly string[]): CanvasDoc {
  const template = sixShotTemplate()
  const additions = template.nodes.filter(n => nodeIds.includes(n.id) && !doc.nodes.some(old => old.id === n.id))
  if (!additions.length) return doc
  const nodes = [...doc.nodes, ...additions]
  const edges = template.edges.filter(e => nodes.some(n => n.id === e.source) && nodes.some(n => n.id === e.target) && !doc.edges.some(old => old.id === e.id))
  return { ...doc, nodes, edges: [...doc.edges, ...edges] }
}

export function sixShotFixtures(full = false) {
  const state = preparedFixtures()
  const shots: Shot[] = SIX_SHOTS.map((s,i) => ({ id: s.id, time: `${s.start}-${s.end}s`, shot: s.prompt, line: '', text: '', purpose: i === 0 ? 'hook' : i === 5 ? 'cta' : 'body', tip: `Six-shot adaptation · ${s.title} · source-derived storyboard playback.` }))
  for (const idea of state.ideas) {
    idea.shots = structuredClone(shots)
    idea.notes = 'Six-shot adaptation v2. Prepared source-derived storyboard playback; no fresh AI generation. Approval is fixture data.'
    idea.script = { lines: SIX_SHOTS.map(s => ({ say: '', onScreen: `Adapted copy: ${s.copy}` })), basedOn: JSON.stringify(shots.map(s => [s.shot,'',''])), writtenAt: preparedAt }
    const canvas = state.canvases[idea.id]
    const template = sixShotTemplate()
    canvas.doc = full ? template : { ...template, nodes: template.nodes.filter(n => n.type === 'shot'), edges: [] }
    const cut = tofuCase.assets.find(a => a.id === 'prepared-source-derived-cut')!
    canvas.generations = [{ id: cut.id, ideaId: idea.id, nodeId: 'prepared-imported-fullcut', kind: 'video', model: 'imported', inputs: { prompt: `Prepared import: ${cut.label}`, sentPrompt: cut.label, duration: 10.517 }, status: 'done', estUsd: 0, actualUsd: 0, url: cut.relativePath, error: null, createdAt: preparedAt, finishedAt: preparedAt }]
    state.sources[idea.id] = [{ key: `generation:${cut.id}`, kind: 'generation', id: cut.id, url: cut.relativePath, duration: 10.517, hasAudio: true, width: 1080, height: 1920 }]
    state.projects[idea.id].project.clips = SIX_SHOTS.map(s => ({ id: `six-clip-${s.id}`, source: { kind: 'generation', id: cut.id, shotId: s.id }, in: s.start, out: s.end, volume: 0, muted: true }))
    state.cuts[idea.id] = { ...state.cuts[GUIDED_IDS.plans.ai], stale: true, step: 'Existing source-derived cut · excludes six-shot draft edits', output: { url: cut.relativePath, size: 6567831, durationSec: 10.517 }, review: { status: 'waiting', sentAt: preparedAt } }
  }
  return state
}
