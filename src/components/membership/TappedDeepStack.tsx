'use client'

// The five Deep Stack prices, under the answer to a tap on one of its tables.
// The blurb above says three times the chips from 750 to 40,000; this lists
// each price with its chips and blinds, and the ladder table it is taken from
// (`deepStackTwin`), so a buyer can place it against a table they already know.
// Read from `DEEP_STACK_TABLES`, the list the tables are dealt by, so the page
// cannot quote a stack the table does not have.
//
// Loaded on its own (`next/dynamic` in TappedFor), like the other samples.

import { DEEP_STACK_TABLES, deepStackTwin } from '@/config/venues'
import { useMoney } from '@/lib/useMoney'

export function TappedDeepStack() {
  const money = useMoney()
  const level = DEEP_STACK_TABLES[0]?.handsPerLevel

  return (
    <figure className="mt-5 rounded-xl border border-foreground/10 bg-background/60 px-4 py-4">
      <figcaption className="text-sm text-muted-foreground">
        The five prices, and the table each one is taken from.
      </figcaption>
      <ul className="mt-3 flex flex-col gap-2">
        {DEEP_STACK_TABLES.map((table) => {
          const twin = deepStackTwin(table)
          return (
            <li key={table.id} className="rounded-2xl border border-foreground/10 px-4 py-3">
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-semibold tabular-nums">{money(table.buyIn)} to sit</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {money(table.startingStack ?? table.buyIn)} chips
                </span>
              </span>
              {twin && (
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {twin.name}’s players and blinds ({money(table.smallBlind)}/
                  {money(table.bigBlind)}). There you’d sit with {money(twin.buyIn)}.
                </span>
              )}
            </li>
          )
        })}
      </ul>
      {level && (
        <p className="mt-4 text-sm text-muted-foreground">
          The blinds go up every {level} hands. Long enough to play a hand rather than shove it.
        </p>
      )}
    </figure>
  )
}
