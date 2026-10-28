// The house edges /blog/blackjack-house-edge-hit-or-stand prints, held to the
// figures each table card states. The count itself is too slow for the suite
// (src/config/blackjackEdge.ts).

import test from 'ava'
import { PLAYED_EDGE } from '@/config/blackjackEdge'
import { HOUSE_RULES } from '@/lib/blackjack/rules'

test('every table card states the edge it played at, to one decimal', (t) => {
  for (const house of HOUSE_RULES) {
    t.is(house.edgePercent, Math.round(PLAYED_EDGE[house.id] * 10) / 10, house.id)
  }
})
