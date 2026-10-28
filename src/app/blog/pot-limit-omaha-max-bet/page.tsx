import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, Section, Src } from '@/components/marketing/LegalPage'
import { BLOG_POSTS, formatPostDate, postMetadata } from '@/config/blog'
import { membershipFor } from '@/config/membership'
import {
  BIG_BLIND_RERAISE,
  BIG_POT_STAKES,
  FLOP_EXAMPLE,
  PREFLOP_POT_RAISES,
} from '@/config/potLimit'

const post = BLOG_POSTS.find((p) => p.slug === 'pot-limit-omaha-max-bet')!

export const metadata: Metadata = postMetadata(post)

const linkClass =
  'font-medium text-foreground underline decoration-foreground/25 underline-offset-2 transition hover:decoration-foreground'

const n = (count: number) => count.toLocaleString('en-GB')

const { smallBlind, bigBlind, stack, seats } = BIG_POT_STAKES
const [open, hijack] = PREFLOP_POT_RAISES
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five']

export default function PotLimitMaxBetPost() {
  return (
    <LegalPage
      title={post.title}
      subtitle={formatPostDate(post.date)}
      back={{ href: '/blog', label: 'All posts' }}
    >
      <Section title="Raise the pot, after you call">
        <p>
          In Pot-Limit Omaha the most you can bet is the pot. That part is easy. The part people
          stop and count on their fingers is raising: you may raise by the size of the pot{' '}
          <em>after</em> you have called. Put the call in, look at the pot, and raise by that much.
        </p>
        <p>
          Every number below is from The Big Pot, Pip’s Omaha table: {seats} seats, {n(stack)} chips
          each, blinds of {smallBlind} and {bigBlind} to start. None of them were worked out by
          hand. They are what the table itself lets you put in.
        </p>
      </Section>

      <Section title="The first raise">
        <p>
          Before the flop the pot is the two blinds, {n(smallBlind + bigBlind)}. The first player to
          act calls {bigBlind}, which makes it {n(smallBlind + 2 * bigBlind)}, and raises by that:{' '}
          {n(open.maxTo)} in all. Three and a half big blinds, which is the number to remember.
        </p>
      </Section>

      <Section title="Everybody re-raises">
        <p>Now let every player in turn raise as much as they are allowed.</p>
        <ul className="list-disc space-y-1 pl-5">
          {PREFLOP_POT_RAISES.map((row, i) => (
            <li key={row.seat}>
              {row.seat}: {row.allIn ? `all-in for ${n(row.maxTo)}` : `to ${n(row.maxTo)}`}
              {i === 0 ? ', the first raise' : ''}
            </li>
          ))}
        </ul>
        <p>
          The {ORDINALS[PREFLOP_POT_RAISES.length - 1]} raise is the whole stack. The pot would
          allow more, and there is no more. {n(stack / bigBlind)} big blinds sounds deep until{' '}
          {WORDS[PREFLOP_POT_RAISES.length - 1]} people have raised the pot.
        </p>
      </Section>

      <Section title="The shortcut, and the blind it misses">
        <p>
          The sum players do in their heads is three times the bet you face, plus whatever was in
          before it. The hijack faces {n(open.maxTo)} with {n(smallBlind + bigBlind)} of blinds
          behind it: three times {n(open.maxTo)} is {n(3 * open.maxTo)}, plus{' '}
          {n(smallBlind + bigBlind)}, is {n(hijack.maxTo)}. Right.
        </p>
        <p>
          For a blind it is out by the blind. Fold round to the big blind instead and it faces the
          same {n(open.maxTo)}, but {bigBlind} of the pot is already its own, and the call is only{' '}
          {n(open.maxTo - bigBlind)}. The most it may make it is {n(BIG_BLIND_RERAISE)}, not{' '}
          {n(hijack.maxTo)}. So: three times the bet, plus what was in before it, less what you
          already put in on this street.
        </p>
      </Section>

      <Section title="After the flop">
        <p>
          Say the first raise is called by the big blind and everyone else folds. The flop pot is{' '}
          {n(FLOP_EXAMPLE.flopPot)}, and the big blind, first to act, may bet{' '}
          {n(FLOP_EXAMPLE.maxBet)}: the pot, since there is nothing to call. Raising that is the
          shortcut again with nothing of yours in yet, three bets and the pot, which is{' '}
          {n(FLOP_EXAMPLE.maxRaiseTo)}.
        </p>
        <p>
          A pot that starts at {n(FLOP_EXAMPLE.flopPot)} can be{' '}
          {n(FLOP_EXAMPLE.flopPot + FLOP_EXAMPLE.maxBet + FLOP_EXAMPLE.maxRaiseTo)} before anyone
          has called anything on the flop. Pot limit is a limit. It does not feel like one for long.
        </p>
      </Section>

      <Section title="How we counted">
        <p>
          The rule lives in one function in <Src path="src/lib/poker/engine.ts" />, the engine that
          deals every hand at The Big Pot and at The Split, Pip’s Omaha Hi-Lo table, which is
          pot-limit too. <Src path="src/config/potLimit.ts" /> plays the hands above through that
          engine and prints what it allows, and <Src path="tests/potLimit.test.ts" /> checks the
          shortcut against every one of them. So this page cannot print a number the table would
          refuse, and the shortcut cannot drift from the table without the build failing.
        </p>
        <p>
          You do not have to do the sum at the table. The Max button on the bet slider is the pot
          limit, or your stack if that is smaller.
        </p>
      </Section>

      <Section title="Where it is">
        <p>
          The Big Pot and The Split are side tables in the{' '}
          <Link
            href={`${membershipFor('omaha')}&from=blog&post=pot-limit-omaha-max-bet`}
            className={linkClass}
          >
            membership
          </Link>
          . The ladder, the Rail, the Daily and the freeroll stay free, and so does the arithmetic.
        </p>
      </Section>
    </LegalPage>
  )
}
