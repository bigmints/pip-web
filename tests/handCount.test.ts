import test from 'ava'
import {
  BACKFILL,
  MAX_REPORT,
  REPORT_EVERY,
  reportSize,
  roomBucket,
  totalHands,
} from '../src/lib/handCount'

test('a report is a whole number of hands, one to the cap', (t) => {
  t.is(reportSize(REPORT_EVERY), REPORT_EVERY)
  t.is(reportSize(1), 1)
  t.is(reportSize(MAX_REPORT), MAX_REPORT)
  for (const bad of [0, -5, MAX_REPORT + 1, 2.5, '10', null, undefined, Number.NaN, 1e12]) {
    t.is(reportSize(bad), null, String(bad))
  }
})

test('the game reports in batches the server accepts', (t) => {
  t.true(REPORT_EVERY <= MAX_REPORT)
})

test('a room hand counts by how many people were dealt in', (t) => {
  t.is(roomBucket(0), null)
  t.is(roomBucket(1), 'ai')
  t.is(roomBucket(2), 'people')
  t.is(roomBucket(9), 'people')
})

test('the total is both buckets', (t) => {
  t.is(totalHands({ ai: 10, people: 3 }), 13)
  t.true(totalHands(BACKFILL) > 0)
})
