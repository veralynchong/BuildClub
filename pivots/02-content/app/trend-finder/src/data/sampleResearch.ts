// SAMPLE DATA. Made-up Research rows for each sample client, so the sheet isn't empty on first open.
// Every row points at a sample video in sample.ts, so "Plan it" can find the video and its format.

import { entryFromVideo, type ResearchEntry, type ResearchSlot } from '../lib/research.ts'
import { videos } from './sample.ts'

const DAY = 86_400_000
const HOUR = 3_600_000

// Start of today (local), worked out once when the app loads, so the dates stay put between reloads.
const today = (() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
})()

// A row for sample video `videoId`, logged `daysAgo` days ago at `hour` o'clock, with the team's own
// keywords and "Other info".
const row = (
  clientId: string,
  videoId: string,
  daysAgo: number,
  hour: number,
  keywords: string[],
  notes = '',
  slot?: number,
): ResearchEntry => {
  const video = videos.find((v) => v.id === videoId)
  if (!video) throw new Error(`sampleResearch: no sample video ${videoId}`)
  const entry = { ...entryFromVideo(clientId, video, 'sample', today - daysAgo * DAY + hour * HOUR), keywords, notes }
  return slot ? { ...entry, slotId: slotId(clientId, slot) } : entry
}

// Stable ids for the sample slots, e.g. 'evergreen-slot-3'.
const slotId = (clientId: string, n: number) => `${clientId}-slot-${n}`

// YYYY-MM-DD (local) for `days` days from today.
const dateIn = (days: number) => {
  const d = new Date(today + days * DAY + 12 * HOUR)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const sampleResearch: ResearchEntry[] = [
  // Evergreen Foods (tofu). Two full examples of how one video is researched: Video 1 and Video 2 each have six
  // reference accounts from different channels. t11 already has a plan in sampleIdeas, so it is Video 2's "Picked"
  // reference and the rest are "Backup". t6 and t14 (the other sample plans) are the only references of Videos 3 and 4.
  // Video 1: Best tofu recipe
  row('evergreen', 't1', 24, 10, ['crispy tofu', 'asmr', 'quick dinner'], 'Best hook of the lot: the crunch in the first 2 seconds.', 1),
  row('evergreen', 't3', 23, 15, ['crispy tofu', 'snack', 'chips'], 'Bigger account, so the views are less surprising.', 1),
  row('evergreen', 't4', 22, 9, ['crispy tofu', 'student', 'budget meal'], 'Tiny account, huge reach. Budget angle fits Woolworths.', 1),
  row('evergreen', 'i1', 21, 13, ['crispy tofu', 'no air fryer', 'reels'], 'Same recipe on Instagram. Captions on screen.', 1),
  row('evergreen', 'y1', 20, 11, ['crispy tofu', 'youtube shorts'], 'Shorts version, 25 seconds. Good pacing.', 1),
  row('evergreen', 'y2', 19, 16, ['3 ways', 'quick dinner', 'youtube shorts'], 'Three recipes in one. Could be a series.', 1),
  // Video 2: Easy tofu dessert
  row('evergreen', 't9', 17, 10, ['tofu dessert', 'chocolate mousse', '3 ingredients'], 'Huge views but a big account.', 2),
  row('evergreen', 't10', 16, 14, ['high protein', 'tofu dessert', 'gym'], 'Try for the young-professionals crowd.', 2),
  row('evergreen', 't11', 15, 11, ['tofu dessert', 'no-bake', 'cheesecake'], 'Use the silken tofu pack. Client asked for a dessert this month.', 2),
  row('evergreen', 'i5', 14, 16, ['tofu dessert', 'mousse', 'reels'], 'Beautiful shots, needs a stylist.', 2),
  row('evergreen', 'i7', 12, 10, ['tofu dessert', 'kids', 'mums'], 'Fits the busy-mums audience.', 2),
  row('evergreen', 'y4', 10, 13, ['tofu dessert', 'youtube shorts'], 'Good close-ups of the texture.', 2),
  // Videos 3 and 4: the references behind the other two sample plans.
  row('evergreen', 't6', 9, 12, ['blind taste test', 'chicken or tofu', 'street interview'], 'Film on George St on a weekday lunch. Needs 2 people.', 3),
  row('evergreen', 't14', 6, 14, ['tofu press', 'kitchen hack'], 'Quick one, 1 person, no script needed.', 4),

  // MYST Nightclub Sydney. The sample videos are all about tofu, so these rows keep street-interview
  // formats the team would copy (the hook is the original video's, the notes say how MYST would use it).
  row('myst', 'i2', 20, 22, ['street interview', 'sydney', 'george st'], 'Format only: ask people in the queue to guess the DJ from a 5-second clip.', 1),
  row('myst', 't8', 15, 21, ['guess the drink', 'street interview'], 'Mocktail or cocktail? Film at the bar on Saturday before 10pm. Needs 2 people.', 2),
  row('myst', 'i4', 11, 20, ['blind test', 'sydney nightlife'], 'Too polished for us. Keep the "at Central" location hook.', 3),
  row('myst', 't7', 4, 23, ['nobody guessed it', 'reveal'], '', 1),
]

// Slots `topics[0]` = slot 1, …, due every `everyDays` days from today, set up `createdDaysAgo` days ago.
const slots = (clientId: string, createdDaysAgo: number, everyDays: number, topics: string[]): ResearchSlot[] =>
  topics.map((topic, i) => ({
    id: slotId(clientId, i + 1),
    clientId,
    number: i + 1,
    topic,
    dueDate: dateIn((i + 1) * everyDays),
    createdAt: today - createdDaysAgo * DAY + 9 * HOUR,
  }))

// Sample content slots: the videos each client is paying for.
export const sampleResearchSlots: ResearchSlot[] = [
  // Evergreen Foods: 12 videos over 3 months, one due each week. Videos 1 and 2 are full examples; 3 and 4 hold
  // the sample plans' references; 5–12 are empty.
  ...slots('evergreen', 28, 7, [
    'Best tofu recipe',
    'Easy tofu dessert',
    'Street taste test: chicken or tofu?',
    'Kitchen hack: pressing tofu',
    'Buying guide: which tofu to use',
    'High-protein gym meal',
    'Tofu scramble breakfast',
    'Air-fryer tofu',
    'Kids\' lunchbox ideas',
    'Sunday meal prep',
    'One-pan weeknight stir-fry',
    'Summer BBQ tofu skewers',
  ]),
  // MYST Nightclub Sydney: 8 videos a month, one due about every 4 days. Slots 1–3 have references.
  ...slots('myst', 21, 4, [
    'Guess the DJ: queue interviews',
    'Mocktail or cocktail?',
    'Getting to MYST from Central',
    'Saturday headliner promo',
    'Behind the bar: drink of the week',
    'Dress code dos and don\'ts',
    'Bottle service walkthrough',
    'The crowd at midnight',
  ]),
]
