import test from 'ava'
import { hostingAllowance, spentToday, utcDay, type FreeLeft } from '@/lib/multiplayer/freeRoom'

const noon = Date.UTC(2026, 9, 23, 12)
const H = 60 * 60 * 1000
const all: FreeLeft = { room: true, quick: true, slow: true }
const none: FreeLeft = { room: false, quick: false, slow: false }

test('the day is the UTC date', (t) => {
  t.is(utcDay(noon), '2026-10-23')
  t.is(utcDay(Date.UTC(2026, 9, 23, 23, 59, 59)), '2026-10-23')
  t.is(utcDay(Date.UTC(2026, 9, 24, 0, 0, 0)), '2026-10-24')
})

test('one spent today is spent until midnight UTC, and back the next day', (t) => {
  t.false(spentToday(null, noon))
  t.true(spentToday('2026-10-23', noon))
  t.true(spentToday('2026-10-23', noon + 11 * H))
  t.false(spentToday('2026-10-23', noon + 12 * H))
  t.false(spentToday('2026-10-22', noon))
})

test('a member hosts anything and spends nothing', (t) => {
  for (const kind of ['private', 'slow', 'quick'] as const) {
    t.is(hostingAllowance({ member: true, kind, left: none }), 'member')
  }
})

test('without the membership: a room a day, a quick match a day, one slow game at a time', (t) => {
  for (const kind of ['private', 'slow', 'quick'] as const) {
    t.is(hostingAllowance({ member: false, kind, left: all }), 'free')
  }
  t.is(hostingAllowance({ member: false, kind: 'private', left: none }), 'free-room-used')
  t.is(hostingAllowance({ member: false, kind: 'quick', left: none }), 'free-quick-used')
  t.is(hostingAllowance({ member: false, kind: 'slow', left: none }), 'free-slow-used')
})

test('each free one is its own: spending one leaves the others', (t) => {
  const left: FreeLeft = { room: false, quick: true, slow: true }
  t.is(hostingAllowance({ member: false, kind: 'private', left }), 'free-room-used')
  t.is(hostingAllowance({ member: false, kind: 'quick', left }), 'free')
  t.is(hostingAllowance({ member: false, kind: 'slow', left }), 'free')
})
