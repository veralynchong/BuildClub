import { test } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { useTimelineActions } from '../src/lib/editor/useTimelineActions.ts'

// Footage uploaded in Video edit lives in the editor's own take list, not in the canvas's. Fill in shot order has to
// see it (Daphne beta, 2026-11-15: "Shot 1 has no video, skipped" with two takes on shot s1).
const project = { fps: 30, width: 1080, height: 1920, clips: [], texts: [], captions: { enabled: false }, music: null, voiceover: [], primaries: {}, showLogo: false }
const freshTake = { id: 't1', shotId: 's1', chosen: true, createdAt: 1 }
const sources = [{ key: 'take:t1', kind: 'take', id: 't1', url: '', duration: 4, hasAudio: true, width: 1, height: 1 }]

function actionsWith(canvasTakes, updates) {
  let actions
  const Probe = () => {
    actions = useTimelineActions({
      edit: { project, current: () => project, update: (p) => updates.push(p) },
      sources: { sources, error: null, refresh: async () => sources },
      shots: [{ id: 's1' }],
      doc: { nodes: [], edges: [] },
      gens: [],
      takes: canvasTakes,
      readOnly: false,
      onPlaced: () => {},
      notify: () => {},
    })
    return null
  }
  renderToStaticMarkup(React.createElement(Probe))
  return actions
}

test('fill: a take the canvas does not know yet (uploaded in Video edit) is placed when passed in', async () => {
  const updates = []
  const skipped = await actionsWith([], updates).fill([freshTake])
  assert.deepEqual(skipped, [])
  assert.deepEqual(updates[0].clips.map((c) => c.source.id), ['t1'])
})
