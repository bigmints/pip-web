// The hands-played count on the landing page. One object, named "all".
//
// Rooms add their hands as they deal them (`PokerRoom.save`); the game adds its
// hands against the cast in batches (`POST /hands`, src/lib/handTally.ts). The
// landing page's function reads the total (`GET /hands`) and caches it, so this
// is read a few times an hour, not once a visit.
//
// The game's reports are anonymous: a number and nothing else. That makes them
// easy to pad, so a report is capped (`MAX_REPORT`) and one address may report
// once a minute. Over that, a report is dropped, not queued. It is a count on a
// landing page, not a ledger.

import { DurableObject } from 'cloudflare:workers'
import { BACKFILL, type HandCount, reportSize } from '@/lib/handCount'
import { json, type Env } from './env'

/** How often one address may report hands. A hand takes longer than six seconds. */
const REPORT_GAP_MS = 60_000

export class Tally extends DurableObject<Env> {
  private lastReport = new Map<string, number>()

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/read') return json(await this.read(), 200)
    if (url.pathname === '/add' && request.method === 'POST') {
      const body = (await request.json().catch(() => null)) as {
        bucket?: unknown
        n?: unknown
        ip?: unknown
      } | null
      const n = reportSize(body?.n)
      const bucket = body?.bucket === 'people' ? 'people' : 'ai'
      if (!n) return json({ ok: false }, 400)
      if (typeof body?.ip === 'string' && !this.allow(body.ip)) return json({ ok: false }, 429)
      await this.add(bucket, n)
      return json({ ok: true }, 200)
    }
    return json({ error: 'not-found' }, 404)
  }

  private allow(ip: string): boolean {
    const now = Date.now()
    const last = this.lastReport.get(ip)
    if (last !== undefined && now - last < REPORT_GAP_MS) return false
    this.lastReport.set(ip, now)
    // Forget addresses that could report again, so the map stays small.
    if (this.lastReport.size > 5_000) {
      for (const [k, at] of this.lastReport)
        if (now - at >= REPORT_GAP_MS) this.lastReport.delete(k)
    }
    return true
  }

  private async add(bucket: keyof HandCount, n: number): Promise<void> {
    const key = `hands:${bucket}`
    const current = (await this.ctx.storage.get<number>(key)) ?? 0
    await this.ctx.storage.put(key, current + n)
  }

  private async read(): Promise<HandCount> {
    const stored = await this.ctx.storage.get<number>(['hands:ai', 'hands:people'])
    return {
      ai: BACKFILL.ai + (stored.get('hands:ai') ?? 0),
      people: BACKFILL.people + (stored.get('hands:people') ?? 0),
    }
  }
}

export function tallyStub(env: Env): DurableObjectStub {
  return env.TALLY.get(env.TALLY.idFromName('all'))
}

/** A room's hands. Best effort: a count that cannot be added never stops a table. */
export async function countRoomHands(env: Env, bucket: keyof HandCount, n: number): Promise<void> {
  try {
    await tallyStub(env).fetch('https://tally/add', {
      method: 'POST',
      body: JSON.stringify({ bucket, n }),
    })
  } catch (e) {
    console.error('hands not counted', String(e))
  }
}
