// The pot-limit sums `/blog/pot-limit-omaha-max-bet` prints.
//
// The numbers come from the engine (src/config/potLimit.ts). This checks the
// shortcuts the post teaches against them, so a reader doing the sum in their
// head gets the figure the table would let them put in.

import test from 'ava'
import {
  BIG_BLIND_RERAISE,
  BIG_POT_STAKES,
  FLOP_EXAMPLE,
  PREFLOP_POT_RAISES,
} from '../src/config/potLimit'

const { smallBlind, bigBlind, stack } = BIG_POT_STAKES

/** Three times the bet you face, plus everything in before it, less what you already put in. */
const shortcut = (bet: number, potBefore: number, committed: number) =>
  3 * bet + (potBefore - bet) - committed

test('the first raise is three and a half big blinds', (t) => {
  t.is(PREFLOP_POT_RAISES[0].maxTo, 3.5 * bigBlind)
  t.is(PREFLOP_POT_RAISES[0].maxTo, 3 * bigBlind + smallBlind)
})

test('every pot raise before the all-in is the shortcut', (t) => {
  for (const row of PREFLOP_POT_RAISES.filter((r) => !r.allIn)) {
    const bet = row.committed + row.toCall
    t.is(row.maxTo, shortcut(bet, row.potBefore, row.committed), row.seat)
  }
})

test('the stack runs out on the last raise and not before', (t) => {
  const last = PREFLOP_POT_RAISES.at(-1)!
  t.true(last.allIn)
  t.is(last.maxTo, stack)
  t.true(shortcut(last.committed + last.toCall, last.potBefore, last.committed) > stack)
  t.is(PREFLOP_POT_RAISES.filter((r) => r.allIn).length, 1)
  t.true(PREFLOP_POT_RAISES.slice(0, -1).every((r) => r.maxTo < stack))
})

test('the big blind may re-raise less than the hijack, by the blind it posted', (t) => {
  const open = PREFLOP_POT_RAISES[0].maxTo
  const hijack = PREFLOP_POT_RAISES[1].maxTo
  t.is(BIG_BLIND_RERAISE, shortcut(open, smallBlind + bigBlind + open, bigBlind))
  t.is(hijack - BIG_BLIND_RERAISE, bigBlind)
})

test('first in on the flop may bet the pot, and a raise over it is three bets and the pot', (t) => {
  const { open, flopPot, maxBet, maxRaiseTo } = FLOP_EXAMPLE
  t.is(flopPot, 2 * open + smallBlind)
  t.is(maxBet, flopPot)
  t.is(maxRaiseTo, 3 * maxBet + flopPot)
})

test('the post’s description quotes the numbers the engine allows', async (t) => {
  const { BLOG_POSTS } = await import('../src/config/blog')
  const { description } = BLOG_POSTS.find((p) => p.slug === 'pot-limit-omaha-max-bet')!
  const raises = PREFLOP_POT_RAISES.filter((r) => !r.allIn).map((r) =>
    r.maxTo.toLocaleString('en-GB'),
  )
  t.true(description.includes(`${smallBlind} and ${bigBlind} blinds`))
  t.true(
    description.includes(
      `is ${raises[0]}, then ${raises.slice(1, -1).join(', ')} and ${raises.at(-1)}`,
    ),
  )
  t.true(description.includes(`the fifth is all-in from ${stack / bigBlind} big blinds`))
  t.is(PREFLOP_POT_RAISES.length, 5)
})
