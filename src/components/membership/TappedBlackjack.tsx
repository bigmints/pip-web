'use client'

// The three houses, under the answer to a tap on the Blackjack padlock. The
// blurb above says each one tells you its edge before you sit down; this is
// that, from the same list the table is dealt by (`lib/blackjack/rules.ts`), so
// the page cannot quote an edge the table does not have. Read-only, laid out
// like the house picker on the Blackjack card.
//
// Loaded on its own (`next/dynamic` in TappedFor), like the other samples.

import { HOUSE_RULES } from '@/lib/blackjack/rules'

export function TappedBlackjack() {
  return (
    <figure className="mt-5 rounded-xl border border-foreground/10 bg-background/60 px-4 py-4">
      <figcaption className="text-sm text-muted-foreground">
        The three houses, as you see them before you sit down.
      </figcaption>
      <ul className="mt-3 flex flex-col gap-2">
        {HOUSE_RULES.map((house) => (
          <li key={house.id} className="rounded-2xl border border-foreground/10 px-4 py-3">
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">{house.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {house.edgePercent}% to the house
              </span>
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {house.blurb}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">
        Every house wins in the long run. The number says how fast.
      </p>
    </figure>
  )
}
