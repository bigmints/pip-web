'use client'

// What the table builder lets you pick, under the answer to a tap on its
// padlock. The blurb above says seats, stakes, depth, speed, heads and guests
// in a sentence; this lists each choice from the same lists the builder offers
// (`config/customTable.ts`), so the page cannot promise a setting the builder
// does not have. Read-only: pills, not buttons, as in `TappedMultiplayer`.
//
// Loaded on its own (`next/dynamic` in TappedFor), like the other samples.

import {
  CUSTOM_BUY_INS,
  CUSTOM_DEPTHS,
  CUSTOM_SEATS,
  CUSTOM_SPEED_WORDS,
  CUSTOM_SPEEDS,
  invitableCast,
} from '@/config/customTable'
import { useMoney } from '@/lib/useMoney'

export function TappedCustomTable() {
  const money = useMoney()
  const choices: readonly (readonly [string, readonly string[]])[] = [
    ['Buy-in', CUSTOM_BUY_INS.map((n) => money(n))],
    ['Seats, including you', CUSTOM_SEATS.map(String)],
    ['Stacks', CUSTOM_DEPTHS.map((n) => `${n}×`)],
    ['Speed', CUSTOM_SPEEDS.map((n) => CUSTOM_SPEED_WORDS[n] ?? `${n}`)],
    ['Bounty', ['None', 'Up to a quarter of the buy-in']],
    ['Who sits down', [`Any of ${invitableCast().length} regulars`, 'Or drawn as usual']],
  ]

  return (
    <figure className="mt-5 rounded-xl border border-foreground/10 bg-background/60 px-4 py-4">
      <figcaption className="text-sm text-muted-foreground">
        What you pick when you build a table.
      </figcaption>
      <dl className="mt-3 flex flex-col gap-3">
        {choices.map(([choice, options]) => (
          <div key={choice}>
            <dt className="text-sm font-medium">{choice}</dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {options.map((option) => (
                <span
                  key={option}
                  className="rounded-full bg-foreground/[0.06] px-3 py-1 text-xs font-semibold tabular-nums text-muted-foreground"
                >
                  {option}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-muted-foreground">
        The buy-in sets how hard the table plays. A guest who plays harder brings it with them, and
        nothing you pick makes it softer.
      </p>
    </figure>
  )
}
