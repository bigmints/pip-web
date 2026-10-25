// The game's share of the hands-played count on the landing page
// (src/lib/handCount.ts, rooms/src/tally.ts).
//
// Each hand against the cast adds one to a number kept on this device. Every
// `REPORT_EVERY` hands, that number — and nothing else: no id, no name, no
// profile — goes to the room server, and the local number goes back to zero.
// It is the one request Pip makes without an account; the privacy page says so.
//
// Fire-and-forget, like analytics. A report that fails is lost, not retried:
// a few hands missing from a landing-page count is not worth a queue.

import { REPORT_EVERY } from './handCount'

const ROOMS_URL = process.env.NEXT_PUBLIC_ROOMS_URL?.replace(/\/$/, '')
const KEY = 'pip.handsToReport'

export function countHand(): void {
  if (typeof window === 'undefined' || !ROOMS_URL) return
  let n: number
  try {
    n = (Number(localStorage.getItem(KEY)) || 0) + 1
    localStorage.setItem(KEY, String(n >= REPORT_EVERY ? 0 : n))
  } catch {
    // No storage (private mode): this device's hands go uncounted.
    return
  }
  if (n < REPORT_EVERY) return
  fetch(`${ROOMS_URL}/hands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ n }),
    keepalive: true,
  }).catch(() => {})
}
