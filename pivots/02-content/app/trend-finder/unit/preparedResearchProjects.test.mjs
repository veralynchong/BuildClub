import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preparedResearchProjects } from '../src/lib/guided/researchProjects.ts'
import { GUIDED_IDS as ids } from '../src/lib/guided/contracts.ts'
const store = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key,value) => map.set(key,value) } }
const slot = { id: ids.slotId, clientId: ids.clientId, number: 1, topic: 'My tofu project', dueDate: '2026-12-01', createdAt: 0 }

test('twelve Evergreen projects keep the tofu slot and never import another client', () => {
  const out = preparedResearchProjects(store(), [{id:ids.researchId,clientId:ids.clientId,videoId:ids.videoId,slotId:ids.slotId}], [slot])
  assert.equal(out.slots.length,12)
  assert.deepEqual(out.slots[0],slot)
  assert.equal(out.rows.length,15)
  assert.ok(out.slots.every(s=>s.clientId===ids.clientId))
  assert.ok(out.rows.every(s=>s.clientId===ids.clientId))
  assert.equal(out.rows.filter(row=>row.slotId===ids.slotId).length,7)
  assert.deepEqual(out.slots.map(s=>s.number),Array.from({length:12},(_,i)=>i+1))
})
test('one-time additive migration keeps edits, avoids duplicate references and respects later deletion', () => {
  const local=store(), rowsKey='trend-finder.research.v4', slotsKey='trend-finder.research-slots.v2'
  const existing={id:'my-reference',clientId:ids.clientId,videoId:'t1',notes:'Keep this note'}
  local.setItem(rowsKey,JSON.stringify([existing]));local.setItem(slotsKey,JSON.stringify([slot]))
  preparedResearchProjects(local,[],[slot])
  const rows=JSON.parse(local.getItem(rowsKey)),slots=JSON.parse(local.getItem(slotsKey))
  assert.equal(rows.length,14);assert.deepEqual(rows[0],existing);assert.equal(slots.length,12)
  local.setItem(rowsKey,JSON.stringify(rows.slice(0,-1)));local.setItem(slotsKey,JSON.stringify(slots.slice(0,-1)))
  preparedResearchProjects(local,[],[slot])
  assert.equal(JSON.parse(local.getItem(rowsKey)).length,13)
  assert.equal(JSON.parse(local.getItem(slotsKey)).length,11)
  assert.deepEqual(JSON.parse(local.getItem(slotsKey))[0],slot)
})
