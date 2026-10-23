'use client'

import { useRouter } from 'next/navigation'
import { VenueArt } from './VenueArt'
import { WideTableCard } from './wideTableCard'
import type { Venue } from '@/config/venues'
import type { TableSnapshot } from '@/store/game'
import { useMoney } from '@/lib/useMoney'
import { sound } from '@/lib/sound'

/**
 * **Your table** — a table this device left unfinished, in the hero slot.
 *
 * The buy-in is out of the Roll while a table is open, and the play page only
 * resumes it when you land on that venue's route. A refresh does; reopening the
 * app does not, because an installed app starts at `/game` (iOS relaunches a
 * home-screen app there every time it is closed). Without this card the lobby
 * showed a Roll short by the buy-in, the venue you were at priced out, and no
 * way back to the chips sitting on it.
 *
 * No info dialog: the buy-in was confirmed when you sat down, so one tap goes
 * straight back to the felt.
 */
export function ResumeTableCard({
  venue,
  snapshot,
  delay = 0,
}: {
  venue: Venue
  snapshot: TableSnapshot
  delay?: number
}) {
  const router = useRouter()
  const money = useMoney()
  const stack = snapshot.seats.find((s) => s.isHuman)?.stack

  return (
    <WideTableCard
      eyebrow="Your table"
      title={venue.name}
      line={stack === undefined ? 'Game in progress' : `Your stack: ${money(stack)}`}
      cover={
        <VenueArt id={venue.id} accent={venue.accent} className="absolute inset-0 size-full" />
      }
      cta="Back to table"
      onOpen={() => {
        sound.play('tap')
        router.push(`/play/${snapshot.venueId}`)
      }}
      delay={delay}
    />
  )
}
