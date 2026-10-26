// What each Blackjack table took when played, for /blog/blackjack-house-edge-hit-or-stand.
//
// From `pnpm blackjack-edge` (scripts/blackjack-edge.ts) on 2026-10-26: 40
// million hands a table through the engine, two seeds, the best hit-or-stand
// strategy. Too slow for the suite, so it is not re-run there.
// tests/blackjackEdge.test.ts holds the part that can be held: each card's
// figure is this one, rounded.

export const HANDS_PER_TABLE = 40_000_000

/** Percent of each chip staked that the house kept, by table id. */
export const PLAYED_EDGE = {
  friendly: 1.994,
  standard: 2.342,
  brutal: 3.938,
} as const

/** One standard error on each figure, in points. */
export const PLAYED_EDGE_SE = 0.016

/** What the cards said before the 26 October count. */
export const EDGE_BEFORE = {
  friendly: 2,
  standard: 2.4,
  brutal: 4.1,
} as const

/** The same strategy over an endless shoe, worked out exactly rather than dealt. */
export const ENDLESS_SHOE_EDGE = {
  standsSoft17Pays3to2: 2.421,
  hitsSoft17Pays6to5: 3.996,
} as const
