// One free private room a day for anyone with an account (Will, 2026-10-23).
//
// A member opens as many rooms as they like. Anybody else signed in gets one
// live private room per UTC day, counted on the room server when the room is
// created (the `Player` object keeps the day it was last spent). Slow games and
// quick match stay with the membership. The room itself is the same room a
// member opens: nothing at the table says who paid.
//
// A separate allowance from the free member table (`taste.ts`): spending one
// never spends the other.

import type { RoomKind } from './room'

/** The UTC day a moment falls on, as `YYYY-MM-DD`. The allowance resets at midnight UTC. */
export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10)
}

/** Whether today's free room is already spent, given the day it was last spent. */
export function freeRoomSpent(spentDay: string | null, now: number): boolean {
  return spentDay === utcDay(now)
}

/**
 * Whether somebody may open a room of this kind, and on what:
 * `member` (no count), `free` (spends today's room), or a refusal.
 */
export type HostingAllowance = 'member' | 'free' | 'free-room-used' | 'members-only'

export function hostingAllowance(opts: {
  member: boolean
  kind: RoomKind
  spentDay: string | null
  now: number
}): HostingAllowance {
  if (opts.member) return 'member'
  if (opts.kind !== 'private') return 'members-only'
  return freeRoomSpent(opts.spentDay, opts.now) ? 'free-room-used' : 'free'
}
