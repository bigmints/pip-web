'use client'

// The Chip Shop — Pearl's counter. Spend the Roll on style: card backs, the
// deck, table finishes, rings, dealer buttons, the sound the table makes,
// souvenirs of venues you've conquered. Style and story, never edge
// (docs/shop.md) — nothing here touches gameplay. No sale banners, no NEW dots:
// the shop is here when you go looking.
//
// **A roomy picker, like the avatar Customise** (Will, 2026-10-25: the old shop
// was one long list in a narrow dialog). The selected item is shown big, in
// use — a card back dealt on the felt, a ring on your own face, a finish as the
// cloth — and the shelves are tabs over a wrapping grid. On a desktop the
// preview sits beside the grid; on a phone it sits above it, with the action at
// the bottom under your thumb.
//
// Free stock and the members' shelf were rulings of 2026-09-21 (docs/shop.md
// rule 3, rewritten): a free item shows "Use", never a Buy reading 0, and the
// members' shelf is its own tab. Nothing in this room has ever been payable in
// cash.

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Check, Flame, Lock, Play, XIcon } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { PillTabs, ROOMY_DIALOG } from '@/components/ui/picker'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { PlayingCard } from '@/components/PlayingCard'
import { CardBack } from '@/components/CardBack'
import { CountUp } from '@/components/CountUp'
import { AwardChip } from '@/components/AwardChip'
import { accentFromSwatch, type AvatarSpec } from '@/lib/avatar'
import { useProfile } from '@/store/profile'
import { useEntitlement } from '@/store/entitlement'
import { characterById } from '@/config/cast'
import { SHOP_BACKS, cardBackById } from '@/config/cardBacks'
import { avatarRingById, dealerButtonById, soundPackById, type SoundPack } from '@/config/cosmetics'
import { venueById } from '@/config/venues'
import {
  DECK_FACES,
  SHOP_ITEMS,
  SOUVENIRS,
  TABLE_FINISHES,
  membershipForShopItem,
  shopStatus,
  souvenirAward,
  tableFinishById,
  type ShopItem,
  type ShopStatus,
} from '@/config/shop'
import type { Card } from '@/lib/poker/cards'
import { useMoney } from '@/lib/useMoney'
import { sound, type Cue } from '@/lib/sound'
import { cn } from '@/lib/utils'

// --- the shelves ----------------------------------------------------------------

type ShelfId = ShopItem['kind'] | 'members' | 'streak'

/** Earned by the daily reward, never sold: they live on their own tab. */
const earned = (item: ShopItem) => item.streakDay !== undefined

/** The rows of one kind that belong on the open shelf. */
const openShelf = (kind: ShopItem['kind']) =>
  SHOP_ITEMS.filter((item) => item.kind === kind && !item.membersOnly && !earned(item))

const SHELVES: readonly { id: ShelfId; label: string; items: readonly ShopItem[] }[] = [
  {
    id: 'back',
    label: 'Card backs',
    items: SHOP_BACKS.map((d) => SHOP_ITEMS.find((i) => i.id === d.id)!),
  },
  { id: 'face', label: 'Deck', items: DECK_FACES.filter((f) => !f.membersOnly) },
  {
    id: 'finish',
    label: 'Table',
    items: TABLE_FINISHES.filter((f) => !f.membersOnly && !earned(f)),
  },
  { id: 'ring', label: 'Rings', items: openShelf('ring') },
  { id: 'button', label: 'Buttons', items: openShelf('button') },
  { id: 'sound', label: 'Sound', items: openShelf('sound') },
  { id: 'souvenir', label: 'Souvenirs', items: SOUVENIRS.filter((s) => !earned(s)) },
  { id: 'members', label: 'Members', items: SHOP_ITEMS.filter((item) => item.membersOnly) },
  {
    id: 'streak',
    label: 'Streak',
    items: SHOP_ITEMS.filter(earned).sort((a, b) => (a.streakDay ?? 0) - (b.streakDay ?? 0)),
  },
]

/** The cards every deck preview deals: all four suits, so the four-colour deck shows. */
const PREVIEW_HAND: readonly Card[] = [
  { rank: 'A', suit: 'h' },
  { rank: 'K', suit: 's' },
  { rank: 'Q', suit: 'd' },
  { rank: 'J', suit: 'c' },
]

/** A phrase of cues for hearing a sound pack: a deal, a bet, a win. */
const SOUND_PHRASE: readonly { cue: Cue; at: number }[] = [
  { cue: 'deal', at: 0 },
  { cue: 'deal', at: 140 },
  { cue: 'check', at: 420 },
  { cue: 'bet', at: 720 },
  { cue: 'win', at: 1100 },
]

const SPRING = { type: 'spring', stiffness: 380, damping: 28 } as const

// --- the dialog ---------------------------------------------------------------

export function ShopDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(ROOMY_DIALOG, 'gap-0 overflow-hidden p-0')}
        showCloseButton={false}
      >
        {/* Mounted only while open, so each visit starts on the card backs. */}
        {open && <Shop />}
      </DialogContent>
    </Dialog>
  )
}

/** Is this item the one equipped in its category? */
function useEquipped() {
  const profile = useProfile()
  return (item: ShopItem): boolean =>
    (item.kind === 'face' && profile.deckFace === item.id) ||
    (item.kind === 'finish' && profile.tableFinish === item.id) ||
    (item.kind === 'back' && profile.cardBack === item.id) ||
    (item.kind === 'ring' && profile.avatarRing === item.id) ||
    (item.kind === 'button' && profile.dealerButton === item.id) ||
    (item.kind === 'sound' && profile.soundPack === item.id)
}

function Shop() {
  const money = useMoney()
  const profile = useProfile()
  const member = useEntitlement()
  const isEquipped = useEquipped()
  const pearl = characterById('pearl')

  // One dry line per visit.
  const [line] = useState(() => {
    const lines = pearl?.lines.seat ?? []
    return lines.length > 0 ? lines[Math.floor(Math.random() * lines.length)] : null
  })

  const ctx = useMemo(
    () => ({
      owned: new Set(profile.owned),
      member,
      wonVenues: new Set(
        Object.keys(profile.venueRecords).filter((id) => profile.venueRecords[id].won > 0),
      ),
      roll: profile.roll,
    }),
    [profile.owned, profile.venueRecords, profile.roll, member],
  )

  const [shelfId, setShelfId] = useState<ShelfId>('back')
  const shelf = SHELVES.find((s) => s.id === shelfId) ?? SHELVES[0]

  // What each shelf has selected, remembered while the shop is open. A shelf
  // you have not touched opens on the thing you are wearing from it.
  const [picked, setPicked] = useState<Partial<Record<ShelfId, string>>>({})
  const item =
    shelf.items.find((i) => i.id === picked[shelfId]) ??
    shelf.items.find(isEquipped) ??
    shelf.items[0]
  const status = shopStatus(item, ctx)

  const select = (next: ShopItem) => {
    if (next.kind === 'sound') playPhrase(soundPackById(next.id), profile.soundPack)
    else sound.play('tap')
    setPicked((p) => ({ ...p, [shelfId]: next.id }))
  }

  const pearlSwatch = pearl ? `#${pearl.avatar.backgroundColor}` : '#f4e7b6'
  const accent = pearl ? accentFromSwatch(pearl.avatar.backgroundColor) : '#c9a94e'

  return (
    <MotionConfig reducedMotion="user">
      {/* --- header ------------------------------------------------------- */}
      <header
        className="relative flex shrink-0 items-center gap-3 px-4 py-3 pr-12"
        style={{
          backgroundImage: `linear-gradient(135deg, color-mix(in oklab, ${accent} 26%, transparent), color-mix(in oklab, ${pearlSwatch} 10%, transparent) 60%, transparent)`,
        }}
      >
        {pearl && <PlayerAvatar spec={pearl.avatar} size={44} className="size-10 shrink-0" />}
        <div className="min-w-0 flex-1">
          <DialogTitle className="text-base">The Chip Shop</DialogTitle>
          <DialogDescription className="truncate text-xs">
            {line ?? 'Style, never edge.'}
          </DialogDescription>
        </div>
        <p className="shrink-0 rounded-full bg-foreground/[0.07] px-3 py-1 text-sm font-semibold tabular-nums">
          <CountUp value={profile.roll} format={(n) => money(Math.round(n))} />
          <span className="ml-1 text-xs font-medium text-muted-foreground">chips</span>
        </p>
        <DialogClose
          aria-label="Close"
          className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-foreground/[0.07] text-muted-foreground transition hover:bg-foreground/[0.14] hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none"
        >
          <XIcon className="size-4" />
        </DialogClose>
      </header>

      {/* --- body ----------------------------------------------------------
          One grid, two shapes. A phone stacks it: preview, name, tabs, the
          grid, then the action at the bottom. From md the preview, name and
          action make a column on the left and the tabs and grid fill the
          right. */}
      <div
        className={cn(
          'grid min-h-0 flex-1 gap-x-6 gap-y-2.5 p-4 pt-3 md:gap-y-3',
          "grid-cols-1 grid-rows-[auto_auto_auto_minmax(0,1fr)_auto] [grid-template-areas:'stage'_'info'_'tabs'_'grid'_'action']",
          "md:grid-cols-[20rem_minmax(0,1fr)] md:grid-rows-[auto_minmax(0,1fr)_auto_auto] md:[grid-template-areas:'stage_tabs'_'stage_grid'_'info_grid'_'action_grid']",
        )}
      >
        <div className="[grid-area:stage]">
          <Stage item={item} accent={accent} />
        </div>

        <div className="min-w-0 [grid-area:info]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
            >
              <p className="truncate text-lg font-semibold leading-tight">{item.name}</p>
              <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground md:line-clamp-3 md:min-h-[3lh]">
                {item.blurb}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <PillTabs
          className="[grid-area:tabs]"
          tabs={SHELVES}
          value={shelfId}
          onChange={setShelfId}
        />

        <div className="-mx-1.5 min-h-0 overflow-y-auto p-1.5 [grid-area:grid]">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(5.75rem,1fr))] gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(7rem,1fr))]">
            {shelf.items.map((entry) => (
              <Tile
                key={entry.id}
                item={entry}
                status={shopStatus(entry, ctx)}
                equipped={isEquipped(entry)}
                selected={entry.id === item.id}
                onSelect={() => select(entry)}
              />
            ))}
          </div>
        </div>

        <div className="[grid-area:action]">
          {/* Keyed on the item so a half-made purchase never carries over. */}
          <Action key={item.id} item={item} status={status} equipped={isEquipped(item)} />
        </div>
      </div>
    </MotionConfig>
  )
}

/** Plays the phrase in `pack`, then puts the player's own pack back. */
function playPhrase(pack: SoundPack, equipped: string) {
  for (const { cue, at } of SOUND_PHRASE) {
    setTimeout(() => {
      sound.setPack(pack)
      sound.play(cue)
      sound.setPack(soundPackById(useProfile.getState().soundPack ?? equipped))
    }, at)
  }
}

// --- the grid -----------------------------------------------------------------

function Tile({
  item,
  status,
  equipped,
  selected,
  onSelect,
}: {
  item: ShopItem
  status: ShopStatus
  equipped: boolean
  selected: boolean
  onSelect: () => void
}) {
  const locked = status === 'members' || status === 'win' || status === 'streak'
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={item.name}
      whileTap={{ scale: 0.95 }}
      transition={SPRING}
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-2xl bg-foreground/[0.04] px-2 pt-3 pb-2.5 ring-offset-2 ring-offset-popover transition-[background-color,box-shadow]',
        selected ? 'bg-foreground/[0.08] ring-2 ring-foreground/80' : 'hover:bg-foreground/[0.07]',
      )}
    >
      <span className={cn('flex h-16 items-center justify-center', locked && 'opacity-60')}>
        <ShopItemArt item={item} />
      </span>
      <span className="w-full truncate text-center text-xs font-medium">{item.name}</span>
      <TileStatus item={item} status={status} equipped={equipped} />
    </motion.button>
  )
}

function TileStatus({
  item,
  status,
  equipped,
}: {
  item: ShopItem
  status: ShopStatus
  equipped: boolean
}) {
  const money = useMoney()
  const base = 'flex h-4 items-center gap-1 text-2xs tabular-nums'
  if (status === 'usable') {
    if (equipped) {
      return (
        <span className={cn(base, 'font-semibold text-primary')}>
          <Check className="size-3" strokeWidth={3} /> In use
        </span>
      )
    }
    const label =
      item.kind === 'souvenir'
        ? 'On your shelf'
        : item.price > 0
          ? 'Owned'
          : item.membersOnly
            ? 'Included'
            : 'Free'
    return <span className={cn(base, 'text-muted-foreground')}>{label}</span>
  }
  if (status === 'streak') {
    return (
      <span className={cn(base, 'text-streak')}>
        <Flame className="size-2.5 shrink-0" />
        Day {item.streakDay}
      </span>
    )
  }
  if (status === 'members' || status === 'win') {
    return (
      <span className={cn(base, 'max-w-full text-muted-foreground')}>
        <Lock className="size-2.5 shrink-0" />
        <span className="truncate">
          {status === 'members'
            ? 'Members'
            : `Win ${venueById(item.requiresVenueWin ?? '')?.name ?? ''}`}
        </span>
      </span>
    )
  }
  return (
    <span
      className={cn(
        base,
        'font-semibold',
        status === 'buy' ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {money(item.price)}
    </span>
  )
}

/** The small picture on a tile — also the daily reward's picture of a streak item. */
function ShopItemArt({ item }: { item: ShopItem }) {
  const avatar = useProfile((s) => s.avatar)
  switch (item.kind) {
    case 'back':
      return <CardBack design={cardBackById(item.id)} size="sm" />
    case 'face':
      return <SuitRow face={item.id} className="text-lg" />
    case 'finish':
      return (
        <span
          className="block h-11 w-16 rounded-[50%] shadow-inner shadow-black/40 ring-[3px] ring-table-rail"
          style={{ background: clothOf(item.swatch) }}
        />
      )
    case 'ring': {
      const ring = avatarRingById(item.id)
      return (
        <span className="block rounded-full" style={{ background: ring?.ring, padding: 3 }}>
          <PlayerAvatar spec={avatar ?? FALLBACK_AVATAR} size={96} className="size-12" />
        </span>
      )
    }
    case 'button':
      return <DealerDisc id={item.id} className="size-10 text-sm" />
    case 'sound':
      return <SoundBars pack={soundPackById(item.id)} className="h-9 gap-1" bar="w-1.5" />
    case 'souvenir':
      return <AwardChip award={souvenirAward(item)} earned size={48} />
  }
}

// --- the preview ----------------------------------------------------------------

const FALLBACK_AVATAR: AvatarSpec = { seed: 'pip', backgroundColor: 'b6e3f4' }

/** A finish's swatch as cloth, lit from above — the way `TableFelt` lays it. */
function clothOf(swatch: string | undefined, accent = '#7a7a7a'): string {
  const cloth = swatch
    ? `color-mix(in oklab, ${swatch} 66%, var(--color-table-shade))`
    : `color-mix(in oklab, ${accent} 20%, var(--color-table-cloth))`
  return `radial-gradient(75% 60% at 50% 30%, color-mix(in oklab, ${cloth} 84%, var(--color-table-line)), ${cloth} 55%, color-mix(in oklab, ${cloth} 50%, var(--color-table-shade)) 100%)`
}

/**
 * The selected item, big and in use, on a stretch of table: the room's lamp,
 * the rail, and the cloth — your own finish, or the one you are looking at.
 */
function Stage({ item, accent }: { item: ShopItem; accent: string }) {
  const equippedFinish = useProfile((s) => s.tableFinish)
  const swatch = item.kind === 'finish' ? item.swatch : tableFinishById(equippedFinish)?.swatch
  return (
    <div
      className="relative isolate h-36 overflow-hidden rounded-3xl bg-background sm:h-56 md:h-full md:min-h-72"
      style={{
        backgroundImage: `radial-gradient(70% 60% at 50% 35%, color-mix(in oklab, ${accent} 22%, transparent), transparent 75%)`,
      }}
    >
      {/* The rail and the cloth. */}
      <div
        aria-hidden
        className="absolute top-[42%] left-1/2 aspect-[2/1] w-[150%] -translate-x-1/2 rounded-[50%] p-3 md:top-[46%] md:w-[190%]"
        style={{
          background:
            'linear-gradient(to bottom, var(--color-table-rail-edge), var(--color-table-rail) 30%, var(--color-table-shade))',
          boxShadow:
            '0 40px 80px -30px var(--color-table-shade), inset 0 1px 0 color-mix(in oklab, var(--foreground) 12%, transparent)',
        }}
      >
        <div
          className="size-full rounded-[50%]"
          style={{
            background: clothOf(swatch, accent),
            boxShadow:
              'inset 0 0 0 1px color-mix(in oklab, var(--color-table-shade) 60%, transparent), inset 0 14px 40px color-mix(in oklab, var(--color-table-shade) 65%, transparent)',
          }}
        />
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={item.id}
          className="absolute inset-x-0 top-[16%] bottom-0 flex items-center justify-center md:top-[22%]"
          initial={{ opacity: 0, scale: 0.9, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1 } }}
          transition={SPRING}
        >
          <StageArt item={item} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function StageArt({ item }: { item: ShopItem }) {
  const profile = useProfile()
  const avatar = profile.avatar ?? FALLBACK_AVATAR
  switch (item.kind) {
    case 'back': {
      const design = cardBackById(item.id)
      return (
        <div className="flex scale-75 sm:scale-100 md:scale-125">
          <motion.div
            initial={{ rotate: 0, x: 14 }}
            animate={{ rotate: -9, x: 0 }}
            transition={SPRING}
          >
            <CardBack design={design} size="lg" />
          </motion.div>
          <motion.div
            className="-ml-8"
            initial={{ rotate: 0, x: -14 }}
            animate={{ rotate: 9, x: 0 }}
            transition={SPRING}
          >
            <CardBack design={design} size="lg" />
          </motion.div>
        </div>
      )
    }
    case 'face':
      return (
        <div className="flex gap-1.5">
          {PREVIEW_HAND.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -12, rotate: -4 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ ...SPRING, delay: i * 0.05 }}
            >
              <PlayingCard card={card} face={item.id} size="sm" className="sm:hidden" />
              <PlayingCard card={card} face={item.id} size="md" className="hidden sm:flex" />
            </motion.div>
          ))}
        </div>
      )
    case 'finish': {
      const back = cardBackById(profile.cardBack)
      return (
        <div className="relative flex translate-y-3">
          <CardBack design={back} size="md" className="-rotate-6" />
          <CardBack design={back} size="md" className="-ml-6 rotate-6" />
          <DealerDisc
            id={profile.dealerButton}
            className="absolute -right-8 bottom-0 size-6 text-2xs"
          />
        </div>
      )
    }
    case 'ring': {
      const ring = avatarRingById(item.id)
      return (
        <span
          className="block rounded-full shadow-2xl shadow-black/50"
          style={{ background: ring?.ring, padding: 5 }}
        >
          <PlayerAvatar spec={avatar} size={256} className="size-24 sm:size-32 md:size-40" />
        </span>
      )
    }
    case 'button':
      return (
        <div className="relative">
          <PlayerAvatar
            spec={avatar}
            size={192}
            ring={avatarRingById(profile.avatarRing)}
            className="size-20 sm:size-24 md:size-28"
          />
          <motion.span
            className="absolute -top-2 -right-4"
            initial={{ scale: 0.4, rotate: -40 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...SPRING, delay: 0.05 }}
          >
            <DealerDisc
              id={item.id}
              className="size-11 text-lg shadow-lg shadow-black/40 md:size-14 md:text-xl"
            />
          </motion.span>
        </div>
      )
    case 'sound':
      return <SoundStage item={item} />
    case 'souvenir':
      return (
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          className="drop-shadow-2xl"
        >
          <AwardChip
            award={souvenirAward(item)}
            earned
            size={160}
            className="size-24 sm:size-32 md:size-40"
          />
        </motion.div>
      )
  }
}

function SoundStage({ item }: { item: ShopItem }) {
  const pack = soundPackById(item.id)
  const equipped = useProfile((s) => s.soundPack)
  const [beat, setBeat] = useState(0)
  return (
    <div className="flex flex-col items-center gap-4">
      <SoundBars pack={pack} className="h-16 gap-1.5 md:h-20" bar="w-3" beat={beat} />
      <button
        type="button"
        onClick={() => {
          playPhrase(pack, equipped)
          setBeat((b) => b + 1)
        }}
        className="flex items-center gap-1.5 rounded-full bg-foreground/90 px-4 py-1.5 text-sm font-semibold text-background shadow-lg shadow-black/30 transition active:scale-95"
      >
        <Play className="size-3.5 fill-current" /> Listen
      </button>
    </div>
  )
}

// --- the action -----------------------------------------------------------------

/**
 * The one button under the preview: Buy, Use, Take off, or why not. A buy
 * takes two taps — the first turns the button into a confirm, the second
 * spends — so a stray tap on a 120,000-chip finish costs nothing.
 */
function Action({
  item,
  status,
  equipped,
}: {
  item: ShopItem
  status: ShopStatus
  equipped: boolean
}) {
  const money = useMoney()
  const profile = useProfile()
  const [confirming, setConfirming] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const equip = (on: boolean) => {
    if (item.kind === 'face') profile.setDeckFace(on ? item.id : 'classic')
    if (item.kind === 'finish') profile.setTableFinish(on ? item.id : null)
    if (item.kind === 'ring') profile.setAvatarRing(on ? item.id : null)
    if (item.kind === 'back' && on) profile.setCardBack(item.id)
    if (item.kind === 'button' && on) profile.setDealerButton(item.id)
    if (item.kind === 'sound' && on) {
      // Engine first, so the confirming blip is already the new pack.
      sound.setPack(soundPackById(item.id))
      profile.setSoundPack(item.id)
    }
  }

  const base =
    'flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[0.9375rem] font-semibold transition active:scale-[0.98] disabled:active:scale-100'
  const primary = cn(base, 'bg-primary text-primary-foreground hover:bg-primary/90')
  const quiet = cn(base, 'bg-foreground/[0.07] text-foreground hover:bg-foreground/[0.12]')
  const inert = cn(base, 'bg-foreground/[0.05] text-muted-foreground')

  if (status === 'usable') {
    if (item.kind === 'souvenir') {
      return (
        <button type="button" disabled className={inert}>
          <Check className="size-4" /> On your shelf
        </button>
      )
    }
    if (equipped) {
      // Only the categories with a "nothing" can be taken off; a card back,
      // a dealer button and a sound pack are always something.
      const removable = item.kind === 'face' || item.kind === 'finish' || item.kind === 'ring'
      return removable ? (
        <button
          type="button"
          onClick={() => {
            sound.play('tap')
            equip(false)
          }}
          className={quiet}
        >
          Take off
        </button>
      ) : (
        <button type="button" disabled className={inert}>
          <Check className="size-4" /> In use
        </button>
      )
    }
    return (
      <button
        type="button"
        onClick={() => {
          equip(true)
          sound.play('tap')
        }}
        className={primary}
      >
        Use
      </button>
    )
  }

  if (status === 'members') {
    // The one lock chips cannot open, so it goes to the page that says what
    // the members' shelf is, and names this item.
    return (
      <Link href={membershipForShopItem(item.id)} className={quiet}>
        <Lock className="size-4" />
        {item.price > 0 ? `Members · ${money(item.price)}` : 'With the membership'}
      </Link>
    )
  }

  if (status === 'streak') {
    return (
      <button type="button" disabled className={inert}>
        <Flame className="size-4 text-streak" /> Keep a {item.streakDay}-day streak
      </button>
    )
  }

  if (status === 'win') {
    return (
      <button type="button" disabled className={inert}>
        <Lock className="size-4" /> Win {venueById(item.requiresVenueWin ?? '')?.name ?? ''} first
      </button>
    )
  }

  if (status === 'short') {
    return (
      <button type="button" disabled className={inert}>
        {money(item.price)} · {money(item.price - profile.roll)} short
      </button>
    )
  }

  return (
    <motion.button
      type="button"
      layout
      onClick={() => {
        if (!confirming) {
          sound.play('tap')
          setConfirming(true)
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => setConfirming(false), 3500)
          return
        }
        if (timer.current) clearTimeout(timer.current)
        sound.play('call')
        profile.buyItem(item.id, item.price)
        // Bought things go straight on. A souvenir goes on the shelf.
        if (item.kind !== 'souvenir') equip(true)
      }}
      className={cn(primary, confirming && 'bg-foreground text-background hover:bg-foreground/90')}
    >
      {confirming ? `Tap again to buy · ${money(item.price)}` : `Buy · ${money(item.price)}`}
    </motion.button>
  )
}

// --- small pieces ----------------------------------------------------------------

export function DealerDisc({
  id,
  className,
  style,
}: {
  id: string
  className?: string
  style?: React.CSSProperties
}) {
  const button = dealerButtonById(id)
  return (
    <span
      className={cn('flex items-center justify-center rounded-full font-bold', className)}
      style={{
        ...style,
        background: button.face,
        color: button.ink,
        boxShadow: button.edge ? `inset 0 0 0 1.5px ${button.edge}` : undefined,
      }}
      aria-hidden
    >
      D
    </span>
  )
}

/**
 * Five bars whose heights follow the pack's own pitch and loudness, so the
 * packs look as different as they sound. They bounce when the pack plays.
 */
function SoundBars({
  pack,
  className,
  bar,
  beat = 0,
}: {
  pack: SoundPack
  className?: string
  bar: string
  beat?: number
}) {
  const shape = [0.45, 0.8, 1, 0.7, 0.5]
  return (
    <span className={cn('flex items-end justify-center', className)} aria-hidden>
      {shape.map((h, i) => {
        const height = Math.min(100, Math.max(18, h * pack.pitch * (0.5 + pack.gain / 2) * 95))
        return (
          <motion.span
            key={`${i}-${beat}`}
            className={cn('rounded-full bg-foreground/60', bar)}
            initial={beat > 0 ? { height: '15%' } : false}
            animate={{ height: `${height}%` }}
            transition={{ ...SPRING, delay: beat > 0 ? i * 0.06 : 0 }}
          />
        )
      })}
    </span>
  )
}

/** The four suits as a given deck face draws them. */
function SuitRow({ face, className }: { face: string; className?: string }) {
  const fourColour = face === 'face-fourcolor'
  const weight =
    face === 'face-contrast' ? 'font-black' : face === 'face-minimal' ? 'font-light' : undefined
  return (
    <span className={cn('flex gap-0.5 leading-none', className, weight)}>
      <span className="text-suit-red">♥</span>
      <span className="text-foreground">♠</span>
      <span className={fourColour ? 'text-suit-blue' : 'text-suit-red'}>♦</span>
      <span className={fourColour ? 'text-suit-green' : 'text-foreground'}>♣</span>
    </span>
  )
}
