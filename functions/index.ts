// The landing page. As every content page, plus the hands-played line: the
// static page carries it empty and hidden (`HandsPlayed` in
// src/components/marketing/Landing.tsx), and this fills it in from the room
// server's count. Done here rather than in the browser so a visitor's browser
// makes no request for it — the privacy page's promise for people without an
// account. The count is cached for five minutes; if it cannot be had quickly,
// the page goes out as it is, with the line still hidden.

import { type HandCount, totalHands } from '../src/lib/handCount'
import { serveContentPage } from './_shared'

// The Workers runtime's HTMLRewriter, declared here as the site's tsconfig has
// no Workers types (as _shared.ts does for ASSETS).
interface RewrittenElement {
  removeAttribute(name: string): void
  setInnerContent(content: string, options: { html: boolean }): void
}
declare const HTMLRewriter: {
  new (): {
    on(
      selector: string,
      handlers: { element(el: RewrittenElement): void },
    ): {
      transform(response: Response): Response
    }
  }
}

const COUNT_URL = 'https://rooms.playpip.io/hands'
const CACHE_SECONDS = 300
/** The longest the landing page waits for the count. */
const WAIT_MS = 800

type Ctx = Parameters<typeof serveContentPage>[0] & {
  waitUntil(promise: Promise<unknown>): void
}

async function handCount(ctx: Ctx): Promise<HandCount | null> {
  const cache = (caches as unknown as { default: Cache }).default
  const key = new Request(COUNT_URL)
  try {
    const hit = await cache.match(key)
    if (hit) return (await hit.json()) as HandCount
    const res = await fetch(COUNT_URL, { signal: AbortSignal.timeout(WAIT_MS) })
    if (!res.ok) return null
    const count = (await res.json()) as HandCount
    if (typeof count?.ai !== 'number' || typeof count?.people !== 'number') return null
    ctx.waitUntil(
      cache.put(
        key,
        new Response(JSON.stringify(count), {
          headers: { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` },
        }),
      ),
    )
    return count
  } catch {
    return null
  }
}

const n = (x: number) => x.toLocaleString('en-US')

async function serveLanding(ctx: Ctx): Promise<Response> {
  const page = await serveContentPage(ctx)
  if (!(page.headers.get('Content-Type') ?? '').includes('text/html')) return page
  const count = await handCount(ctx)
  if (!count) return page
  const line = `<span class="font-medium text-foreground">${n(totalHands(count))}</span> hands played · ${n(count.ai)} against the AI · ${n(count.people)} against people`
  const headers = new Headers(page.headers)
  // The body is no longer the asset the ETag names.
  headers.delete('ETag')
  return new HTMLRewriter()
    .on('[data-hands]', {
      element(el) {
        el.removeAttribute('hidden')
        el.setInnerContent(line, { html: true })
      },
    })
    .transform(new Response(page.body, { status: page.status, headers }))
}

export const onRequestGet = serveLanding
export const onRequestHead = serveContentPage
