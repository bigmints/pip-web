// What each Blackjack table actually takes, played rather than looked up.
//
// Every table card states a house edge (`edgePercent` in lib/blackjack/rules.ts)
// and this is where those numbers come from. It deals hands through the real
// engine, plays each one by the best hit-or-stand strategy, and reports what
// the house kept per chip staked, with its standard error.
//
//   pnpm blackjack-edge            # 20,000,000 hands a table, two seeds
//   pnpm blackjack-edge 200000     # a quick look
//
// **The strategy is the best one for a game with only hit and stand**, worked
// out exactly for an infinite deck: hit hard 12 against a 2 or 3, hard 12 to 16
// against 7 to ace, soft 17 always, soft 18 against 9, ten or ace; stand on
// everything else from hard 12 and soft 18 up. Card counting or a per-deck
// strategy would shave a little more, and nobody plays that way.
//
// **Why this is a script and not a test.** The standard error on 40 million
// hands is about 0.016 points, which is what a one-decimal figure needs, and
// that takes three minutes. CI holds what it can cheaply: that the tables are
// ordered by what they take (tests/blackjack.test.ts).

import { deal, handValue, hit, newGame, stand } from '../src/lib/blackjack/engine'
import { HOUSE_RULES } from '../src/lib/blackjack/rules'
import { type Card, mulberry32 } from '../src/lib/poker/cards'

const HANDS = Number(process.argv[2] ?? 20_000_000)
const SEEDS = [12_345, 987_654_321]
/** Divisible by five, so a 6:5 natural pays a whole number of chips. */
const BET = 10

function upValue(card: Card): number {
  if (card.rank === 'A') return 11
  if ('TJQK'.includes(card.rank)) return 10
  return Number(card.rank)
}

function shouldHit(cards: readonly Card[], up: number): boolean {
  const { total, soft } = handValue(cards)
  if (soft) return total <= 17 || (total === 18 && up >= 9)
  if (total <= 11) return true
  if (total >= 17) return false
  if (total === 12) return up < 4 || up > 6
  return up >= 7
}

for (const rules of HOUSE_RULES) {
  let sum = 0
  let sumSq = 0
  for (const seed of SEEDS) {
    const rng = mulberry32(seed + rules.decks)
    let state = newGame(rules, Number.MAX_SAFE_INTEGER, rng)
    for (let i = 0; i < HANDS; i++) {
      state = deal(state, BET, rng)
      const up = upValue(state.dealer[0])
      while (state.phase === 'player' && state.hand && !state.hand.done) {
        state = shouldHit(state.hand.cards, up) ? hit(state, rng) : stand(state, rng)
      }
      const net = ((state.hand?.returned ?? 0) - BET) / BET
      sum += net
      sumSq += net * net
    }
  }
  const n = HANDS * SEEDS.length
  const mean = sum / n
  const se = Math.sqrt((sumSq / n - mean * mean) / n)
  console.log(
    `${rules.name.padEnd(9)} card says ${rules.edgePercent}%, played ${(-mean * 100).toFixed(3)}% ` +
      `+/- ${(se * 100).toFixed(3)} over ${n.toLocaleString('en-GB')} hands`,
  )
}
