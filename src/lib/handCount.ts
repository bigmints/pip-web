// The hands-played count on the landing page: what it starts from and the
// rules for adding to it. Pure, shared by the room server (which keeps the
// count) and the game (which reports its hands).
//
// Two buckets. `ai` is every hand dealt against the cast: the single-player
// game, with or without an account, and a multiplayer table with one person at
// it. `people` is every multiplayer hand with two or more people dealt in.

export interface HandCount {
  ai: number
  people: number
}

/**
 * Everything played before the count existed (it went live 2026-10-25),
 * worked out once from what was on hand that day. The live count adds to this.
 *
 *   ai, accounts: 116,041. The sum of `stats.handsPlayed` over every synced
 *     profile (171 of them), read from Supabase. Exact.
 *   ai, guests: ~17,000. An estimate. Umami had ~650 profiles made and there
 *     were 171 accounts, so ~480 guest profiles. Guests play less than people
 *     who make an account, so each is put at the account holders' 25th
 *     percentile (35 hands) rather than their median (163).
 *   people: ~100. An estimate. Rooms have not counted hands, and a finished
 *     room deletes its storage. Cloudflare logged ~2,800 messages out of the
 *     room server since multiplayer went live (2026-10-11); a hand is roughly a
 *     dozen updates sent to two or three people.
 */
export const BACKFILL: HandCount = { ai: 116_041 + 17_000, people: 100 }

/** The most hands one report from the game may add. */
export const MAX_REPORT = 20

/** How many hands the game holds before reporting them. */
export const REPORT_EVERY = 10

/** A report's hand count, or null if it is not one the server should take. */
export function reportSize(n: unknown): number | null {
  if (typeof n !== 'number' || !Number.isInteger(n)) return null
  if (n < 1 || n > MAX_REPORT) return null
  return n
}

/**
 * Which bucket a multiplayer hand goes in, by how many people were dealt in.
 * A table of bots alone counts nowhere: nobody played it.
 */
export function roomBucket(people: number): keyof HandCount | null {
  if (people >= 2) return 'people'
  if (people === 1) return 'ai'
  return null
}

export function totalHands(count: HandCount): number {
  return count.ai + count.people
}
