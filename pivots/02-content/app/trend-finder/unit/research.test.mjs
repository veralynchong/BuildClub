import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  researchId,
  entryFromVideo,
  viewsPerFollower,
  planOf,
  researchStatus,
  withPlanRows,
  videoFromLink,
  slotSummary,
  researchProgress,
  newSlot,
} from '../src/lib/research.ts'
import { sampleResearch, sampleResearchSlots } from '../src/data/sampleResearch.ts'
import { videos, sampleIdeas } from '../src/data/sample.ts'

const video = (o = {}) => ({
  id: 'v1',
  platform: 'tiktok',
  handle: '@cook.sample',
  hook: 'Crispy tofu',
  views: 50_000,
  followers: 5_000,
  medianViews: 4_000,
  daysAgo: 3,
  lengthSec: 15,
  shares: 100,
  saves: null,
  formatId: 'crispy-asmr',
  keywords: ['tofu'],
  ...o,
})
const idea = (o = {}) => ({ id: 'c-v1', videoId: 'v1', clientId: 'c', dueDate: '2099-01-01', notes: '', status: 'saved', ...o })
const link = (o = {}) => ({
  url: 'https://www.tiktok.com/@someone/video/7400000000000000001',
  platform: 'tiktok',
  account: '@someone',
  followers: 1_000,
  views: 20_000,
  hook: 'Watch this',
  keywords: [],
  notes: '',
  ...o,
})

test('entryFromVideo copies the numbers and the account', () => {
  const e = entryFromVideo('c', video({ url: 'https://x/1' }), 'search', 123)
  assert.equal(e.id, researchId('c', 'v1'))
  assert.equal(e.id, 'c-v1')
  assert.equal(e.clientId, 'c')
  assert.equal(e.videoId, 'v1')
  assert.equal(e.account, '@cook.sample')
  assert.equal(e.platform, 'tiktok')
  assert.equal(e.followers, 5_000)
  assert.equal(e.views, 50_000)
  assert.equal(e.url, 'https://x/1')
  assert.equal(e.hook, 'Crispy tofu')
  assert.equal(e.notes, '')
  assert.equal(e.loggedAt, 123)
  assert.equal(e.source, 'search')
})

test('entryFromVideo merges keywords and hashtags without duplicates', () => {
  const e = entryFromVideo('c', video({ keywords: ['tofu', ' crispy ', ''], hashtags: ['#tofu', 'Crispy', '#ASMR', 'asmr', '#'] }))
  assert.deepEqual(e.keywords, ['tofu', 'crispy', 'ASMR'])
})

test('entryFromVideo copes with no hashtags', () => {
  assert.deepEqual(entryFromVideo('c', video()).keywords, ['tofu'])
})

test('viewsPerFollower: views ÷ followers, null with no followers', () => {
  assert.equal(viewsPerFollower({ views: 50_000, followers: 5_000 }), 10)
  assert.equal(viewsPerFollower({ views: 100, followers: 0 }), null)
})

test('researchStatus follows the plan', () => {
  const e = entryFromVideo('c', video())
  const status = (o) => researchStatus(e, [idea(o)])
  assert.equal(researchStatus(e, []), 'none')
  assert.equal(researchStatus(e, [idea({ clientId: 'other' })]), 'none')
  assert.equal(researchStatus(e, [idea({ videoId: 'v2' })]), 'none')
  assert.equal(status({ status: 'saved' }), 'planning')
  assert.equal(status({ status: 'rejected' }), 'planning')
  assert.equal(status({ status: 'waiting' }), 'waiting')
  assert.equal(status({ status: 'approved' }), 'approved')
  assert.equal(status({ status: 'approved', stage: 'approved' }), 'approved')
  assert.equal(status({ status: 'approved', stage: 'filming' }), 'filming')
  assert.equal(status({ status: 'approved', stage: 'editing' }), 'editing')
  assert.equal(status({ status: 'approved', stage: 'posted' }), 'posted')
})

test('planOf finds the plan for the same client and video', () => {
  const e = entryFromVideo('c', video())
  const plan = idea()
  assert.equal(planOf(e, [idea({ clientId: 'x' }), plan]), plan)
  assert.equal(planOf(e, []), undefined)
})

test('withPlanRows adds a row for each plan without one', () => {
  const byId = new Map([
    ['v1', video()],
    ['v2', video({ id: 'v2', handle: '@two' })],
  ])
  const have = [entryFromVideo('c', video())]
  const out = withPlanRows(have, [idea(), idea({ id: 'c-v2', videoId: 'v2' })], byId, 7)
  assert.equal(out.length, 2)
  assert.equal(out[0], have[0])
  assert.equal(out[1].id, 'c-v2')
  assert.equal(out[1].account, '@two')
  assert.equal(out[1].source, 'plan')
  assert.equal(out[1].loggedAt, 7)
})

test('withPlanRows returns the same array when nothing is added', () => {
  const have = [entryFromVideo('c', video())]
  const byId = new Map([['v1', video()]])
  assert.equal(withPlanRows(have, [idea()], byId), have)
  assert.equal(withPlanRows(have, [], byId), have)
})

test('withPlanRows skips plans whose video is unknown, and adds a row once', () => {
  const byId = new Map([['v1', video()]])
  const have = []
  assert.equal(withPlanRows(have, [idea({ videoId: 'gone' })], byId), have)
  assert.equal(withPlanRows([], [idea(), idea()], byId).length, 1)
})

test('withPlanRows keeps rows per client', () => {
  const byId = new Map([['v1', video()]])
  const out = withPlanRows([entryFromVideo('a', video())], [idea({ clientId: 'b', id: 'b-v1' })], byId)
  assert.deepEqual(out.map((e) => e.id), ['a-v1', 'b-v1'])
})

test('videoFromLink: the same URL gives the same id', () => {
  const a = videoFromLink(link(), 1).video
  const b = videoFromLink(link({ url: '  https://www.tiktok.com/@someone/video/7400000000000000001 ' }), 2).video
  assert.equal(a.id, b.id)
  assert.match(a.id, /^link-/)
})

test('videoFromLink: different URLs give different ids, even with a long shared start or only case apart', () => {
  const long = 'https://www.tiktok.com/@a-very-long-account-name-for-this-test/video/'
  const ids = new Set([
    videoFromLink(link({ url: `${long}7400000000000000001` })).video.id,
    videoFromLink(link({ url: `${long}7400000000000000002` })).video.id,
    videoFromLink(link({ url: 'https://youtube.com/shorts/AbCdE', platform: 'youtube' })).video.id,
    videoFromLink(link({ url: 'https://youtube.com/shorts/abcde', platform: 'youtube' })).video.id,
  ])
  assert.equal(ids.size, 4)
})

test('videoFromLink: a format whose id matches the video, with the typed details', () => {
  const { video: v, format } = videoFromLink(link({ keywords: ['Dance', '#dance', 'club'], notes: 'Needs 2 people' }), 99)
  assert.equal(format.id, v.formatId)
  assert.equal(v.url, 'https://www.tiktok.com/@someone/video/7400000000000000001')
  assert.equal(v.handle, '@someone')
  assert.equal(v.hook, 'Watch this')
  assert.equal(v.views, 20_000)
  assert.equal(v.followers, 1_000)
  assert.equal(v.fetchedAt, 99)
  assert.deepEqual(v.keywords, ['Dance', 'club'])
  assert.equal(format.summary, 'Needs 2 people')
  assert.deepEqual(format.shotList, [])
})

test('videoFromLink: blank account falls back to the site, blank hook to the URL, bad numbers to 0', () => {
  const { video: v } = videoFromLink(link({ account: ' ', hook: '', views: Number.NaN, followers: -5 }))
  assert.equal(v.handle, new URL(v.url).hostname.replace(/^www\./, ''))
  assert.equal(v.hook, v.url)
  assert.equal(v.views, 0)
  assert.equal(v.followers, 0)
})

test('a row from a pasted link can be planned: entryFromVideo works on it', () => {
  const { video: v } = videoFromLink(link())
  const e = entryFromVideo('c', v, 'link')
  assert.equal(e.videoId, v.id)
  assert.equal(viewsPerFollower(e), 20)
})

test('sampleResearch: every row uses a sample video', () => {
  const ids = new Set(videos.map((v) => v.id))
  for (const e of sampleResearch) assert.ok(ids.has(e.videoId), `${e.id} uses unknown video ${e.videoId}`)
})

test('sampleResearch: ids are unique and match researchId', () => {
  const ids = sampleResearch.map((e) => e.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const e of sampleResearch) assert.equal(e.id, researchId(e.clientId, e.videoId))
})

test('sampleResearch: every sample plan has a row', () => {
  const ids = new Set(sampleResearch.map((e) => e.id))
  for (const i of sampleIdeas) assert.ok(ids.has(researchId(i.clientId, i.videoId)), `no row for plan ${i.id}`)
  const byId = new Map(videos.map((v) => [v.id, v]))
  assert.equal(withPlanRows(sampleResearch, sampleIdeas, byId), sampleResearch)
})

test('sampleResearch: rows for every sample client, logged in the past', () => {
  const now = Date.now()
  for (const c of ['evergreen', 'myst']) assert.ok(sampleResearch.some((e) => e.clientId === c), `no rows for ${c}`)
  for (const e of sampleResearch) {
    assert.equal(e.source, 'sample')
    assert.ok(e.loggedAt < now, `${e.id} is logged in the future`)
  }
})

// Content slots

const slot = (o = {}) => ({ id: 's1', clientId: 'c', number: 1, topic: 'Crispy tofu', createdAt: 0, ...o })
const ref = (videoId, o = {}) => ({ ...entryFromVideo('c', video({ id: videoId })), slotId: 's1', ...o })
const planFor = (videoId, o = {}) => idea({ id: `c-${videoId}`, videoId, ...o })

test('slotSummary: a slot with no references', () => {
  assert.deepEqual(slotSummary(slot(), [], []), { refs: [], picked: undefined, status: 'none' })
})

test('slotSummary: references but none planned', () => {
  const refs = [ref('v1'), ref('v2')]
  const s = slotSummary(slot(), [...refs, ref('v3', { slotId: 's2' }), ref('v4', { slotId: undefined })], [planFor('v3')])
  assert.deepEqual(s.refs, refs)
  assert.equal(s.picked, undefined)
  assert.equal(s.status, 'none')
})

test('slotSummary: the planned reference is picked, with its plan status', () => {
  const refs = [ref('v1'), ref('v2'), ref('v3')]
  const s = slotSummary(slot(), refs, [planFor('v2')])
  assert.equal(s.refs.length, 3)
  assert.equal(s.picked, refs[1])
  assert.equal(s.status, 'planning')
})

test('slotSummary: status follows the picked plan', () => {
  const refs = [ref('v1'), ref('v2')]
  const status = (o) => slotSummary(slot(), refs, [planFor('v2', o)]).status
  assert.equal(status({ status: 'waiting' }), 'waiting')
  assert.equal(status({ status: 'approved' }), 'approved')
  assert.equal(status({ status: 'approved', stage: 'filming' }), 'filming')
  assert.equal(status({ status: 'approved', stage: 'posted' }), 'posted')
})

test("slotSummary ignores another client's row pointing at the slot", () => {
  const other = { ...entryFromVideo('x', video()), slotId: 's1' }
  const s = slotSummary(slot(), [other], [idea({ clientId: 'x', id: 'x-v1' })])
  assert.deepEqual(s.refs, [])
  assert.equal(s.status, 'none')
})

test('researchProgress counts slots, picked, approved (and further), posted and unsorted', () => {
  const slots = [1, 2, 3, 4, 5].map((n) => slot({ id: `s${n}`, number: n }))
  const entries = [
    ref('a', { slotId: 's1' }), // planning
    ref('b', { slotId: 's2' }), // approved
    ref('c', { slotId: 's3' }), // filming
    ref('d', { slotId: 's4' }), // posted
    ref('e', { slotId: 's4' }), // backup in s4
    ref('f', { slotId: undefined }), // unsorted
    ref('g', { slotId: 'gone' }), // its slot was removed
  ]
  const ideas = [
    planFor('a'),
    planFor('b', { status: 'approved' }),
    planFor('c', { status: 'approved', stage: 'filming' }),
    planFor('d', { status: 'approved', stage: 'posted' }),
  ]
  assert.deepEqual(researchProgress(slots, entries, ideas), { slots: 5, picked: 4, approved: 3, posted: 1, unsorted: 2 })
})

test("researchProgress: a row pointing at another client's slot is unsorted", () => {
  const slots = [slot({ id: 's1', clientId: 'c' }), slot({ id: 'x1', clientId: 'x' })]
  const entries = [ref('a', { slotId: 'x1' }), ref('b', { slotId: 's1' })]
  assert.equal(researchProgress(slots, entries, []).unsorted, 1)
})

test('researchProgress: nothing yet', () => {
  assert.deepEqual(researchProgress([], [], []), { slots: 0, picked: 0, approved: 0, posted: 0, unsorted: 0 })
})

test('newSlot: number is the highest + 1 for that client only, topic trimmed', () => {
  const existing = [slot({ id: 'a', number: 1 }), slot({ id: 'b', number: 4 }), slot({ id: 'x', clientId: 'x', number: 9 })]
  const s = newSlot('c', existing, '  Tofu dessert ', '2099-01-01', 42)
  assert.equal(s.number, 5)
  assert.equal(s.clientId, 'c')
  assert.equal(s.topic, 'Tofu dessert')
  assert.equal(s.dueDate, '2099-01-01')
  assert.equal(s.createdAt, 42)
  assert.ok(!existing.some((e) => e.id === s.id))
  assert.equal(newSlot('new', existing, 'First').number, 1)
})

test('newSlot: a removed slot in the middle does not reuse a number; a blank due date is left out', () => {
  const s = newSlot('c', [slot({ id: 'a', number: 1 }), slot({ id: 'c3', number: 3 })], 'x', '')
  assert.equal(s.number, 4)
  assert.equal(s.dueDate, undefined)
})

test('newSlot: ids stay unique when made in the same millisecond', () => {
  const first = newSlot('c', [], 'a', undefined, 5)
  const clash = { ...first, number: 0 }
  const second = newSlot('c', [clash], 'b', undefined, 5)
  assert.notEqual(second.id, first.id)
})

test('sampleResearchSlots: every slotId exists and belongs to the same client', () => {
  const byId = new Map(sampleResearchSlots.map((s) => [s.id, s]))
  assert.equal(byId.size, sampleResearchSlots.length, 'slot ids are unique')
  for (const e of sampleResearch) {
    if (!e.slotId) continue
    const s = byId.get(e.slotId)
    assert.ok(s, `${e.id} points at unknown slot ${e.slotId}`)
    assert.equal(s.clientId, e.clientId, `${e.id} points at another client's slot`)
  }
})

test('sampleResearchSlots: numbers are 1..n per client, with due dates', () => {
  for (const c of ['evergreen', 'myst']) {
    const mine = sampleResearchSlots.filter((s) => s.clientId === c)
    assert.ok(mine.length > 0, `no slots for ${c}`)
    assert.deepEqual(mine.map((s) => s.number).sort((a, b) => a - b), mine.map((_, i) => i + 1))
    for (const s of mine) {
      assert.match(s.dueDate, /^\d{4}-\d{2}-\d{2}$/)
      assert.ok(s.topic.trim().length > 0)
      assert.ok(s.createdAt < Date.now())
    }
  }
})

test('sampleResearchSlots: Evergreen has 12 slots, two full example videos, every sample plan sorted', () => {
  const slots = sampleResearchSlots.filter((s) => s.clientId === 'evergreen')
  const rows = sampleResearch.filter((e) => e.clientId === 'evergreen')
  assert.equal(slots.length, 12)
  const byNumber = (n) => slots.find((s) => s.number === n)
  assert.equal(byNumber(1).topic, 'Best tofu recipe')
  assert.equal(byNumber(2).topic, 'Easy tofu dessert')
  assert.ok(slotSummary(byNumber(1), rows, sampleIdeas).refs.length >= 5, 'Video 1 needs several references')
  assert.ok(slotSummary(byNumber(2), rows, sampleIdeas).refs.length >= 5, 'Video 2 needs several references')
  const p = researchProgress(slots, rows, sampleIdeas)
  assert.ok(p.picked >= 1, 'no picked slot with the sample plans')
  // No Unsorted rows in the sample, and every sample plan's reference sits in a slot.
  assert.equal(p.unsorted, 0)
  for (const i of sampleIdeas.filter((x) => x.clientId === 'evergreen')) {
    assert.ok(rows.some((e) => e.videoId === i.videoId && e.slotId), `plan ${i.videoId} has no slotted row`)
  }
})

test('newSlot: uses the number asked for; a bad number falls back to the next one', () => {
  const existing = [slot({ id: 'a', number: 1 }), slot({ id: 'b', number: 2 })]
  assert.equal(newSlot('c', existing, 'x', undefined, 1, 7).number, 7)
  assert.equal(newSlot('c', existing, 'x', undefined, 1, 0).number, 3)
  assert.equal(newSlot('c', existing, 'x', undefined, 1, 2.5).number, 3)
})

test('accountFromUrl: reads @handles from TikTok, YouTube and Instagram links, else blank', async () => {
  const { accountFromUrl } = await import('../src/components/research/sheet.ts')
  assert.equal(accountFromUrl('https://www.tiktok.com/@katsu.lab/video/1'), '@katsu.lab')
  assert.equal(accountFromUrl('youtube.com/@cookclub/shorts'), '@cookclub')
  assert.equal(accountFromUrl('https://instagram.com/greenbowl/'), '@greenbowl')
  assert.equal(accountFromUrl('https://instagram.com/reel/abc'), '')
  assert.equal(accountFromUrl('https://youtube.com/shorts/xyz'), '')
  assert.equal(accountFromUrl('not a link'), '')
})

test('groupRows: the picked reference goes to the top of its video; rowRole reads Backup from the row', async () => {
  const { groupRows, rowRole } = await import('../src/components/research/slots.ts')
  const s = slot({ id: 's1' })
  const a = { id: 'a', clientId: 'c', slotId: 's1' }
  const b = { id: 'b', clientId: 'c', slotId: 's1', backup: true }
  const c = { id: 'c', clientId: 'c', slotId: 's1' }
  const [g] = groupRows([s], [a, b, c], [a, b, c], () => ({ refs: [a, b, c], picked: c, status: 'planning' }))
  assert.deepEqual(g.rows.map((e) => e.id), ['c', 'a', 'b'])
  assert.equal(rowRole(c, g), 'picked')
  assert.equal(rowRole(b, g), 'backup')
  assert.equal(rowRole(a, g), 'open')
})
