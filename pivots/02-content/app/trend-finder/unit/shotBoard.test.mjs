import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DATA_URL_LIMIT,
  STEP_X,
  addLoose,
  autoLayout,
  boardEditable,
  boardFromShots,
  boardShots,
  distToSegment,
  edgeAt,
  edgesOf,
  footageShot,
  idMaker,
  insertAfter,
  insertBetween,
  keepInPlan,
  mediaKind,
  moveNode,
  placeLoose,
  removeNode,
  replaceShots,
  retime,
  secondsOf,
  setPosition,
  tidy,
  toPlan,
  totalSeconds,
  updateShot,
} from '../src/lib/shotBoard.ts'

const shots = () => [
  { time: '0-3s', shot: 'Pour the sauce' },
  { time: '3-8s', shot: 'Stir', framing: 'close_up' },
  { time: '8-12s', shot: 'Plate it', line: 'Dinner in ten' },
]
const fresh = (layout) => boardFromShots(shots(), layout, idMaker('n'))
const order = (b) => b.order.map((n) => n.shot.shot)
const links = (b) => edgesOf(b).map((e) => `${e.source}>${e.target}`)

test('shots are laid out left to right, each linked to the next', () => {
  const b = fresh()
  assert.deepEqual(b.order.map((n) => n.id), ['n1', 'n2', 'n3'])
  assert.deepEqual(b.order.map((n) => [n.x, n.y]), [[0, 0], [STEP_X, 0], [2 * STEP_X, 0]])
  assert.deepEqual(links(b), ['n1>n2', 'n2>n3'])
  assert.deepEqual(autoLayout(2, { x: 5, y: 7 }), [{ x: 5, y: 7 }, { x: 5 + STEP_X, y: 7 }])
  assert.deepEqual(edgesOf(boardFromShots([], undefined, idMaker())), [])
})

test('saved positions are used only when there is one for every shot', () => {
  const layout = [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }]
  assert.deepEqual(fresh(layout).order.map((n) => [n.x, n.y]), [[1, 2], [3, 4], [5, 6]])
  assert.equal(fresh(layout.slice(0, 2)).order[1].x, STEP_X, 'out of date layout is ignored')
  assert.equal(fresh([{ x: 1, y: 2 }, { x: NaN, y: 0 }, { x: 0, y: 0 }]).order[0].x, 0, 'junk layout is ignored')
})

test('toPlan saves the shots in order with rounded positions', () => {
  const b = setPosition(fresh(), 'n2', 10.4, 20.6)
  const plan = toPlan(b)
  assert.deepEqual(plan.shots.map((s) => s.shot), ['Pour the sauce', 'Stir', 'Plate it'])
  assert.deepEqual(plan.boardLayout[1], { x: 10, y: 21 })
})

test('insert between two linked shots re-links and re-times', () => {
  const b = insertBetween(fresh(), 'n1', 'n2', { time: '', shot: 'Taste test' }, idMaker('x'))
  assert.deepEqual(order(b), ['Pour the sauce', 'Taste test', 'Stir', 'Plate it'])
  assert.deepEqual(links(b), ['n1>x1', 'x1>n2', 'n2>n3'])
  assert.deepEqual(b.order.map((n) => n.shot.time), ['0-3s', '3-6s', '6-11s', '11-15s'])
  // the new card takes the old place; the rest move one step right
  assert.deepEqual(b.order.map((n) => n.x), [0, STEP_X, 2 * STEP_X, 3 * STEP_X])
})

test('insert between shots that are not next to each other is refused', () => {
  assert.equal(insertBetween(fresh(), 'n1', 'n3', { time: '', shot: 'x' }, idMaker()), null)
  assert.equal(insertBetween(fresh(), 'nope', 'n2', { time: '', shot: 'x' }, idMaker()), null)
})

test('insert after a shot, at the start, and after an unknown id (the end)', () => {
  assert.deepEqual(order(insertAfter(fresh(), 'n3', { time: '', shot: 'End card' }, idMaker('x'))).at(-1), 'End card')
  assert.deepEqual(order(insertAfter(fresh(), null, { time: '', shot: 'Cold open' }, idMaker('x')))[0], 'Cold open')
  assert.deepEqual(order(insertAfter(fresh(), 'gone', { time: '', shot: 'Tail' }, idMaker('x'))).at(-1), 'Tail')
})

test('removing a shot links its neighbours and re-times', () => {
  const b = removeNode(fresh(), 'n2')
  assert.deepEqual(links(b), ['n1>n3'])
  assert.deepEqual(b.order.map((n) => n.shot.time), ['0-3s', '3-7s'])
  assert.equal(b.order[1].x, STEP_X)
  assert.equal(removeNode(b, 'missing'), b)
})

test('moving a shot swaps it with its neighbour', () => {
  const b = moveNode(fresh(), 'n3', -1)
  assert.deepEqual(order(b), ['Pour the sauce', 'Plate it', 'Stir'])
  assert.deepEqual(links(b), ['n1>n3', 'n3>n2'])
  assert.equal(b.order[1].x, STEP_X, 'positions stay in reading order')
  assert.equal(moveNode(b, 'n1', -1), b, 'the first cannot go earlier')
})

test('editing a shot keeps everything else', () => {
  const b = updateShot(fresh(), 'n2', { shot: 'Stir slowly' })
  assert.equal(b.order[1].shot.shot, 'Stir slowly')
  assert.equal(b.order[1].shot.framing, 'close_up')
})

test('uploads: only photos and clips, small images kept in the plan', () => {
  assert.equal(mediaKind('image/png'), 'image')
  assert.equal(mediaKind('video/mp4'), 'video')
  assert.equal(mediaKind('application/pdf'), null)
  assert.equal(keepInPlan('image', DATA_URL_LIMIT), true)
  assert.equal(keepInPlan('image', DATA_URL_LIMIT + 1), false)
  assert.equal(keepInPlan('video', 10), false)
})

test('an upload sits loose, then drops into the sequence', () => {
  const footage = { key: 'f1', kind: 'video', name: 'beach.mp4', deviceOnly: true }
  let b = addLoose(fresh(), footageShot(footage, 'Your footage: beach.mp4'), idMaker('u'))
  assert.equal(b.loose.length, 1)
  assert.deepEqual(links(b), ['n1>n2', 'n2>n3'], 'a loose upload is not linked')
  assert.deepEqual(toPlan(b).shots.length, 3, 'and not in the plan')
  b = placeLoose(b, 'u1', 'n2')
  assert.equal(b.loose.length, 0)
  assert.deepEqual(links(b), ['n1>n2', 'n2>u1', 'u1>n3'])
  assert.equal(toPlan(b).shots[2].footage.name, 'beach.mp4')
  assert.equal(toPlan(b).shots[2].time, '8-11s')
})

test('an upload can go first, and placing an unknown id does nothing', () => {
  const b0 = addLoose(fresh(), footageShot({ key: 'k', kind: 'image', name: 'a.png', src: 'data:x' }, 'A'), idMaker('u'))
  assert.deepEqual(links(placeLoose(b0, 'u1', null)).at(0), 'u1>n1')
  assert.equal(placeLoose(b0, 'zz', 'n1'), b0)
  assert.equal(removeNode(b0, 'u1').loose.length, 0)
})

test('edgeAt finds the link a card was dropped on', () => {
  const b = fresh()
  // halfway between card 1 and card 2, on the row
  const hit = edgeAt(b, STEP_X / 2 + 120, 150)
  assert.equal(hit?.source, 'n1')
  assert.equal(hit?.target, 'n2')
  assert.equal(edgeAt(b, STEP_X / 2 + 120, 5000), null)
  assert.equal(distToSegment(0, 5, 0, 0, 10, 0), 5)
  assert.equal(distToSegment(-3, 4, 0, 0, 10, 0), 5)
})

test('tidy lines the sequence up and puts loose uploads underneath', () => {
  let b = setPosition(fresh(), 'n1', 999, 999)
  b = addLoose(b, { time: '', shot: 'x' }, idMaker('u'))
  b = tidy(b)
  assert.deepEqual([b.order[0].x, b.order[0].y], [0, 0])
  assert.ok(b.loose[0].y > 0)
})

test('a rewrite replaces the sequence and keeps loose uploads', () => {
  let b = addLoose(fresh(), { time: '', shot: 'x' }, idMaker('u'))
  b = replaceShots(b, [{ time: '0-2s', shot: 'One' }], idMaker('r'))
  assert.deepEqual(order(b), ['One'])
  assert.equal(b.loose.length, 1)
})

test('retime runs times on and keeps times that are not ranges', () => {
  assert.deepEqual(
    retime([{ time: '5-8s', shot: 'a' }, { time: '', shot: 'b' }, { time: 'end', shot: 'c' }, { time: '1-2s', shot: 'd' }]).map((s) => s.time),
    ['0-3s', '3-6s', 'end', '6-7s'],
  )
  assert.equal(secondsOf('2.5-4s'), 1.5)
  assert.equal(secondsOf('0:03'), null)
  assert.equal(totalSeconds(shots()), 12)
})

test('which shots the board opens with, and when it can be changed', () => {
  const ref = [{ time: '0-1s', shot: 'ref' }]
  assert.equal(boardShots({}, ref), ref)
  assert.deepEqual(boardShots({ shots: [] }, ref), [])
  assert.equal(boardEditable({ status: 'saved' }), true)
  assert.equal(boardEditable({ status: 'rejected' }), true)
  assert.equal(boardEditable({ status: 'waiting' }), false)
  assert.equal(boardEditable({ status: 'waiting', approvedAt: 1 }), true)
  assert.equal(boardEditable({ status: 'approved', approvedAt: 1 }), false)
})
