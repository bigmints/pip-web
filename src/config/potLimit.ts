// The pot-limit sums /blog/pot-limit-omaha-max-bet prints.
//
// Nothing here is typed in. Each number is the engine's own `maxRaiseTo` at
// The Big Pot's opening blinds, read off hands played through `startHand` and
// `applyAction`, so the post cannot disagree with the table it describes.
// tests/potLimit.test.ts checks the shortcuts the post states against them.

import { applyAction, type HandState, legalActions, potSize, startHand } from '@/lib/poker/engine'
import { mulberry32 } from '@/lib/poker/cards'
import { BIG_POT } from './venues'

/** The seat names in the order the post walks round the table, button first. */
const SEAT_NAMES = ['Button', 'Small blind', 'Big blind', 'Under the gun', 'Hijack', 'Cutoff']

function bigPotHand(): HandState {
  return startHand({
    seats: SEAT_NAMES.map((name, i) => ({
      id: String(i),
      name,
      stack: BIG_POT.startingStack ?? BIG_POT.buyIn,
    })),
    buttonIndex: 0,
    smallBlind: BIG_POT.smallBlind,
    bigBlind: BIG_POT.bigBlind,
    // The cards are dealt but never looked at: nothing below depends on them.
    rng: mulberry32(1),
    variant: BIG_POT.variant,
  })
}

interface PotRaise {
  seat: string
  /** The pot before this player acts, every chip in. */
  potBefore: number
  /** Chips they already had in on this street: a blind, or nothing. */
  committed: number
  /** What they had to call. */
  toCall: number
  /** The most they may put it to. */
  maxTo: number
  /** True once the cap is the whole stack. */
  allIn: boolean
}

/**
 * Every player in turn raises the most they may, starting under the gun,
 * until one of them is all-in.
 */
function preflopPotRaises(): PotRaise[] {
  let hand = bigPotHand()
  const raises: PotRaise[] = []
  for (;;) {
    const legal = legalActions(hand)
    if (!legal) break
    const p = hand.players[hand.toActIndex]
    const allInTo = p.committedThisStreet + p.stack
    raises.push({
      seat: p.name,
      potBefore: potSize(hand),
      committed: p.committedThisStreet,
      toCall: legal.callAmount,
      maxTo: legal.maxRaiseTo,
      allIn: legal.maxRaiseTo === allInTo,
    })
    if (legal.maxRaiseTo === allInTo) break
    hand = applyAction(hand, { type: 'raise', amount: legal.maxRaiseTo })
  }
  return raises
}

export const PREFLOP_POT_RAISES: readonly PotRaise[] = preflopPotRaises()

/**
 * The same raise the hijack faces in `PREFLOP_POT_RAISES`, faced by the big
 * blind instead: under the gun opens for the pot and everyone folds round.
 * The blind already has chips in, so the most it may make it is less.
 */
function blindReraise(): number {
  let hand = bigPotHand()
  hand = applyAction(hand, { type: 'raise', amount: legalActions(hand)!.maxRaiseTo })
  // Hijack, cutoff, button and small blind fold.
  for (let i = 0; i < 4; i++) hand = applyAction(hand, { type: 'fold' })
  return legalActions(hand)!.maxRaiseTo
}

export const BIG_BLIND_RERAISE: number = blindReraise()

interface FlopExample {
  /** Under the gun's opening pot raise. */
  open: number
  /** The pot on the flop, after the big blind calls and everyone else folds. */
  flopPot: number
  /** The big blind's biggest bet, first in on the flop. */
  maxBet: number
  /** Under the gun's biggest raise over that bet. */
  maxRaiseTo: number
}

/** Under the gun opens for the pot, the big blind calls, then bets the pot on the flop. */
function flopExample(): FlopExample {
  let hand = bigPotHand()
  const open = legalActions(hand)!.maxRaiseTo
  hand = applyAction(hand, { type: 'raise', amount: open })
  // Hijack, cutoff, button and small blind fold; the big blind calls.
  for (let i = 0; i < 4; i++) hand = applyAction(hand, { type: 'fold' })
  hand = applyAction(hand, { type: 'call' })
  if (hand.street !== 'flop') throw new Error('the example never reached the flop')
  const flopPot = potSize(hand)
  const maxBet = legalActions(hand)!.maxRaiseTo
  hand = applyAction(hand, { type: 'bet', amount: maxBet })
  const maxRaiseTo = legalActions(hand)!.maxRaiseTo
  return { open, flopPot, maxBet, maxRaiseTo }
}

export const FLOP_EXAMPLE: FlopExample = flopExample()

export const BIG_POT_STAKES = {
  smallBlind: BIG_POT.smallBlind,
  bigBlind: BIG_POT.bigBlind,
  stack: BIG_POT.startingStack ?? BIG_POT.buyIn,
  seats: BIG_POT.seats,
} as const
