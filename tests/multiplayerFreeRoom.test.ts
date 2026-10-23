import test from 'ava'
import { freeRoomSpent, hostingAllowance, utcDay } from '@/lib/multiplayer/freeRoom'

const noon = Date.UTC(2026, 9, 23, 12)
const H = 60 * 60 * 1000

test('the day is the UTC date', (t) => {
  t.is(utcDay(noon), '2026-10-23')
  t.is(utcDay(Date.UTC(2026, 9, 23, 23, 59, 59)), '2026-10-23')
  t.is(utcDay(Date.UTC(2026, 9, 24, 0, 0, 0)), '2026-10-24')
})

test('a room spent today is spent until midnight UTC, and back the next day', (t) => {
  t.false(freeRoomSpent(null, noon))
  t.true(freeRoomSpent('2026-10-23', noon))
  t.true(freeRoomSpent('2026-10-23', noon + 11 * H))
  t.false(freeRoomSpent('2026-10-23', noon + 12 * H))
  t.false(freeRoomSpent('2026-10-22', noon))
})

test('a member opens anything and spends nothing', (t) => {
  for (const kind of ['private', 'slow', 'quick'] as const) {
    t.is(hostingAllowance({ member: true, kind, spentDay: '2026-10-23', now: noon }), 'member')
  }
})

test('without the membership: one private room a day', (t) => {
  t.is(hostingAllowance({ member: false, kind: 'private', spentDay: null, now: noon }), 'free')
  t.is(
    hostingAllowance({ member: false, kind: 'private', spentDay: '2026-10-22', now: noon }),
    'free',
  )
  t.is(
    hostingAllowance({ member: false, kind: 'private', spentDay: '2026-10-23', now: noon }),
    'free-room-used',
  )
})

test('slow games and quick match stay with the membership', (t) => {
  t.is(hostingAllowance({ member: false, kind: 'slow', spentDay: null, now: noon }), 'members-only')
  t.is(
    hostingAllowance({ member: false, kind: 'quick', spentDay: null, now: noon }),
    'members-only',
  )
})
