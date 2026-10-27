// The daily reward — come back each day, claim chips, and the chips grow with
// the streak (Will, 2026-10-25).
//
// **One flame.** Claiming counts as a day for the streak (lib/streak), the same
// as playing a hand does, so the reward and the streak are the same run and
// there is never a second counter to explain. Miss a day and the ladder starts
// again at day 1; items already earned stay yours.
//
// **The ladder** is seven days that repeat, measured in buy-ins at your table:
// the lowest rung of the ladder you have not won yet (Will, 2026-10-25: a
// reward has to be at least enough to sit down at your level). Day 1 is one
// buy-in, day 7 is three. So 100 chips at the Garage and a million at the Main
// Event mean the same thing: a seat, and then some. **Past the first week the
// top rate holds** (Will, 2026-10-25): every day of a streak longer than seven
// pays day 7's reward, so a long streak is always worth more than starting one.
//
// **Members get double the chips**, every day, item days included. A streak
// item is the same item for everybody.
//
// Pure: every function takes the day key it is asked about.

import { SHOP_ITEMS, type ShopItem } from '@/config/shop'
import { ALL_VENUES, VENUES, type Venue } from '@/config/venues'
import { daysBetween, recordPlay, type PlayStreak } from '@/lib/streak'

/** The persisted record: the last UTC day a reward was claimed. */
export interface RewardRecord {
  lastClaim: string | null
}

/** Each ladder day, in buy-ins at your table, days 1–7. */
export const LADDER: readonly number[] = [1, 1.25, 1.5, 1.75, 2, 2.5, 3]

/** The day the streak opens its table (config/venues `streakUnlock`). */
export const STREAK_TABLE_DAY = 21

/** Members get this many times the chips. */
export const MEMBER_MULTIPLIER = 2

/**
 * One thing a streak day hands over: a shop item, or a table (with the regular
 * who sits at it). Held in `profile.owned` under `id` once earned.
 */
export interface StreakUnlock {
  day: number
  id: string
  /** What a player calls it: "Ember ring", "The Regulars' Table". */
  name: string
  blurb: string
  item: ShopItem | null
  venue: Venue | null
}

const NOUNS: Record<ShopItem['kind'], string> = {
  ring: 'ring',
  back: 'card back',
  button: 'dealer button',
  finish: 'table finish',
  souvenir: '',
  face: 'deck',
  sound: 'sound pack',
}

/** Everything the streak hands over, in the order it is earned. */
export const MILESTONES: readonly StreakUnlock[] = [
  ...SHOP_ITEMS.filter((item) => item.streakDay !== undefined).map((item) => ({
    day: item.streakDay as number,
    id: item.id,
    name: NOUNS[item.kind] ? `${item.name} ${NOUNS[item.kind]}` : item.name,
    blurb: item.blurb,
    item,
    venue: null,
  })),
  ...ALL_VENUES.filter((venue) => venue.streakUnlock).map((venue) => ({
    day: STREAK_TABLE_DAY,
    id: venue.streakUnlock as string,
    name: venue.name,
    blurb: 'A new table, and Maud, who only plays there.',
    item: null,
    venue,
  })),
].sort((a, b) => a.day - b.day)

/**
 * The table at your level: the lowest ladder rung you have not won, or the top
 * rung once you have won them all. Its buy-in is what the reward is counted in.
 */
export function yourTable(venueRecords: Readonly<Record<string, { won?: number } | undefined>>): {
  id: string
  name: string
  buyIn: number
} {
  const venue =
    VENUES.find((v) => (venueRecords[v.id]?.won ?? 0) === 0) ?? VENUES[VENUES.length - 1]
  return { id: venue.id, name: venue.name, buyIn: venue.buyIn }
}

/** A chip count a person would say out loud: 25, 150, 2,500, 45,000. */
export function roundNice(n: number): number {
  const step = n < 100 ? 5 : n < 1_000 ? 25 : n < 10_000 ? 250 : n < 100_000 ? 2_500 : 5_000
  return Math.max(step, Math.round(n / step) * step)
}

/** Where a streak day falls on the seven-day ladder, 1–7. */
export function ladderDay(streakDay: number): number {
  return ((Math.max(1, streakDay) - 1) % LADDER.length) + 1
}

export interface Reward {
  /** The streak day this reward is for. */
  streakDay: number
  /** Where it sits in its week, 1–7. */
  ladderDay: number
  /** The rung of the ladder it pays: the streak day, held at 7 past the first week. */
  rate: number
  /** What a non-member gets. */
  baseChips: number
  /** What this player gets. */
  chips: number
  /** What the streak hands over today, or null. */
  unlock: StreakUnlock | null
}

/** The reward on this streak day, for a player whose table has this buy-in. */
export function rewardFor(streakDay: number, buyIn: number, member: boolean): Reward {
  const day = ladderDay(streakDay)
  const rate = Math.min(Math.max(1, streakDay), LADDER.length)
  const baseChips = roundNice(buyIn * LADDER[rate - 1])
  return {
    streakDay,
    ladderDay: day,
    rate,
    baseChips,
    chips: member ? baseChips * MEMBER_MULTIPLIER : baseChips,
    unlock: MILESTONES.find((m) => m.day === streakDay) ?? null,
  }
}

/** Has today's reward still to be claimed? */
export function claimable(record: RewardRecord | null | undefined, today: string): boolean {
  return (record?.lastClaim ?? null) !== today
}

/**
 * The streak day a claim today lands on. Today already played is today's day;
 * a run alive from yesterday goes one up; anything else is day 1.
 */
export function claimDay(streak: PlayStreak, today: string): number {
  return recordPlay(streak, today).current
}

/** The next streak item after `streakDay`, or null past the last one. */
export function nextMilestone(streakDay: number): StreakUnlock | null {
  return MILESTONES.find((m) => m.day > streakDay) ?? null
}

/**
 * Two devices' records, combined. The later claim wins, so a claim on either
 * device counts for both and signing in elsewhere is not a second reward.
 */
export function mergeRewards(
  a: RewardRecord | null | undefined,
  b: RewardRecord | null | undefined,
): RewardRecord | null {
  const x = a?.lastClaim ?? null
  const y = b?.lastClaim ?? null
  if (x === null) return y === null ? (a ?? b ?? null) : { lastClaim: y }
  if (y === null) return { lastClaim: x }
  return { lastClaim: daysBetween(x, y) > 0 ? y : x }
}
