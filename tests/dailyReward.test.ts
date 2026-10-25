import test from 'ava'
import {
  LADDER,
  MILESTONES,
  claimDay,
  claimable,
  ladderDay,
  mergeRewards,
  nextMilestone,
  rewardFor,
  roundNice,
  yourTable,
} from '@/lib/dailyReward'
import { REGULARS_TABLE, VENUES } from '@/config/venues'
import { refuseSitDown } from '@/lib/sitDown'
import { characterById, rosterFor } from '@/config/cast'
import { emptyStreak } from '@/lib/streak'
import { cosmeticPurchasable, cosmeticUnlocked } from '@/config/cosmetics'
import { cardBackById, cardBackUnlocked } from '@/config/cardBacks'

test('the ladder rises every day, from one buy-in to three', (t) => {
  t.is(LADDER.length, 7)
  for (let i = 1; i < LADDER.length; i++) t.true(LADDER[i] > LADDER[i - 1])
  t.is(LADDER[0], 1)
  t.is(LADDER[6], 3)
})

test('ladderDay repeats every seven days', (t) => {
  t.deepEqual([1, 2, 7, 8, 14, 15, 30].map(ladderDay), [1, 2, 7, 1, 7, 1, 2])
})

test('your table is the lowest rung not yet won, or the top once all are', (t) => {
  t.is(yourTable({}).id, 'garage')
  t.is(yourTable({ garage: { won: 1 }, pub: { won: 0 } }).id, 'pub')
  const all = Object.fromEntries(VENUES.map((v) => [v.id, { won: 1 }]))
  t.is(yourTable(all).id, VENUES[VENUES.length - 1].id)
})

test('day 1 always pays at least a seat at your table', (t) => {
  for (const venue of VENUES) {
    t.true(rewardFor(1, venue.buyIn, false).chips >= venue.buyIn, venue.id)
  }
  // A brand-new player: 100 on day 1, 300 on day 7.
  t.is(rewardFor(1, 100, false).chips, 100)
  t.is(rewardFor(7, 100, false).chips, 300)
})

test('members get double, every day', (t) => {
  for (let day = 1; day <= 14; day++) {
    const r = rewardFor(day, 5_000, true)
    t.is(r.chips, r.baseChips * 2)
  }
})

test('roundNice gives chip counts a person would say', (t) => {
  t.deepEqual(
    [roundNice(23), roundNice(137), roundNice(2_380), roundNice(41_200)],
    [25, 125, 2_500, 40_000],
  )
  t.true(roundNice(1) > 0)
})

test('streak unlocks fall on their days and nowhere else', (t) => {
  t.deepEqual(
    MILESTONES.map((m) => m.day),
    [7, 14, 21, 30, 60, 100, 150, 200, 365],
  )
  t.is(rewardFor(7, 100, false).unlock?.id, 'ring-ember')
  t.is(rewardFor(21, 100, false).unlock?.venue?.id, 'regulars')
  t.is(rewardFor(6, 100, false).unlock, null)
  t.is(rewardFor(22, 100, false).unlock, null)
  t.is(nextMilestone(7)?.day, 14)
  t.is(nextMilestone(365), null)
})

test('past the first week the top rate holds; a broken streak starts again', (t) => {
  const top = rewardFor(7, 300, false).chips
  for (const day of [8, 9, 14, 15, 40, 400]) t.is(rewardFor(day, 300, false).chips, top, `${day}`)
  t.is(rewardFor(1, 300, false).chips, 300)
})

test('streak items are never for sale and only open once earned', (t) => {
  const none = new Set<string>()
  for (const { item } of MILESTONES) {
    if (!item) continue
    t.is(item.price, 0)
    if (item.kind === 'back') {
      t.false(cardBackUnlocked(cardBackById(item.id), none, none, true))
      t.true(cardBackUnlocked(cardBackById(item.id), none, new Set([item.id]), false))
    } else {
      t.false(cosmeticUnlocked(item, none, true), `${item.id} open without the streak`)
      t.false(cosmeticPurchasable(item, none, true), `${item.id} is for sale`)
      t.true(cosmeticUnlocked(item, new Set([item.id]), false))
    }
  }
})

test('the streak table refuses until it is earned, and only after the money', (t) => {
  const p = { roll: 10_000, venueRecords: {}, challengeWins: [], challengesPlayed: 0 }
  t.is(refuseSitDown(REGULARS_TABLE, p, 'd', true), 'streak-locked')
  t.is(refuseSitDown(REGULARS_TABLE, { ...p, owned: ['table-regulars'] }, 'd', false), null)
  t.is(refuseSitDown(REGULARS_TABLE, { ...p, roll: 10 }, 'd', false), 'cannot-afford')
})

test("Maud sits at the Regulars' Table and nowhere else", (t) => {
  t.deepEqual(
    rosterFor(REGULARS_TABLE).map((c) => c.id),
    ['maud'],
  )
  t.deepEqual(characterById('maud')?.only, ['regulars'])
})

test('claimable once per UTC day', (t) => {
  t.true(claimable(null, '2026-10-25'))
  t.false(claimable({ lastClaim: '2026-10-25' }, '2026-10-25'))
  t.true(claimable({ lastClaim: '2026-10-24' }, '2026-10-25'))
})

test('claimDay: yesterday carries on, a gap starts again, today played stays', (t) => {
  t.is(claimDay(emptyStreak(), '2026-10-25'), 1)
  t.is(claimDay({ current: 4, best: 4, lastDate: '2026-10-24' }, '2026-10-25'), 5)
  t.is(claimDay({ current: 4, best: 9, lastDate: '2026-10-22' }, '2026-10-25'), 1)
  t.is(claimDay({ current: 4, best: 4, lastDate: '2026-10-25' }, '2026-10-25'), 4)
})

test('mergeRewards keeps the later claim, so a second device is not a second reward', (t) => {
  t.deepEqual(mergeRewards({ lastClaim: '2026-10-25' }, { lastClaim: '2026-10-24' }), {
    lastClaim: '2026-10-25',
  })
  t.deepEqual(mergeRewards(null, { lastClaim: '2026-10-24' }), { lastClaim: '2026-10-24' })
  t.is(mergeRewards(null, null), null)
})
