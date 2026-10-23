'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Lock, Shuffle, SlidersHorizontal } from 'lucide-react'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { membershipFor } from '@/config/membership'
import {
  AVATAR_BG_SWATCH_NAMES,
  AVATAR_BG_SWATCHES,
  avatarCloseUpUri,
  freshSeed,
  resolvedFeatures,
  type AvatarSpec,
} from '@/lib/avatar'
import { AVATAR_PARTS, type AvatarPart, isOptionalPart, NO_PART } from '@/lib/avatarParts'
import { sound } from '@/lib/sound'
import { cn } from '@/lib/utils'
import { useEntitlement } from '@/store/entitlement'

/** Controlled avatar + name editor, shared by onboarding and the profile dialog. */
export function AvatarEditor({
  spec,
  name,
  onSpecChange,
  onNameChange,
  onSubmit,
  avatarSize = 132,
  compact = false,
  customise = false,
}: {
  spec: AvatarSpec
  name: string
  onSpecChange: (spec: AvatarSpec) => void
  onNameChange: (name: string) => void
  onSubmit?: () => void
  avatarSize?: number
  /**
   * Tighter rhythm for the profile dialog, which has a viewport to fit inside
   * and three more blocks under it. Onboarding owns a whole screen and keeps
   * the roomy default. Same elements either way, only the spacing changes.
   */
  compact?: boolean
  /**
   * Offer the part-by-part picker, which is the membership's (pip-web#259).
   * The profile dialog only: onboarding is a first face on the way to a first
   * hand, and Shuffle is the right tool for that.
   */
  customise?: boolean
}) {
  const member = useEntitlement()
  const [open, setOpen] = useState(false)

  // A new face is a new face: Shuffle clears anything picked by hand too.
  const shuffle = () => {
    sound.play('tap')
    onSpecChange({ seed: freshSeed(), backgroundColor: spec.backgroundColor })
  }

  return (
    <div className={cn('flex flex-col items-center', compact ? 'gap-4' : 'gap-6')}>
      <motion.div
        key={spec.seed}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <PlayerAvatar spec={spec} size={avatarSize} />
      </motion.div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={shuffle}
          className={cn(
            'flex items-center gap-2 rounded-full bg-foreground/5 px-4 text-sm font-medium text-foreground transition hover:bg-foreground/10 active:scale-95',
            compact ? 'py-1.5' : 'py-2',
          )}
        >
          <Shuffle className="size-4" /> Shuffle
        </button>
        {customise && (
          <button
            type="button"
            onClick={() => {
              sound.play('tap')
              setOpen((o) => !o)
            }}
            aria-expanded={open}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 text-sm font-medium text-foreground transition active:scale-95',
              compact ? 'py-1.5' : 'py-2',
              open ? 'bg-foreground/15' : 'bg-foreground/5 hover:bg-foreground/10',
            )}
          >
            {member ? <SlidersHorizontal className="size-4" /> : <Lock className="size-4" />}
            Customise
          </button>
        )}
      </div>

      {customise &&
        open &&
        (member ? (
          <PartPicker spec={spec} onSpecChange={onSpecChange} />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Picking each feature comes with the membership.{' '}
            <Link
              href={membershipFor('cosmetics')}
              onClick={() => sound.play('tap')}
              className="font-medium text-foreground underline underline-offset-2"
            >
              Membership
            </Link>
          </p>
        ))}

      <div className="flex gap-2">
        {AVATAR_BG_SWATCHES.map((swatch) => {
          const isSelected = spec.backgroundColor === swatch

          return (
            <button
              key={swatch}
              type="button"
              onClick={() => {
                sound.play('tap')
                onSpecChange({ ...spec, backgroundColor: swatch })
              }}
              aria-label={AVATAR_BG_SWATCH_NAMES[swatch]}
              aria-pressed={isSelected}
              className={cn(
                'size-7 rounded-full ring-2 ring-transparent transition',
                isSelected && 'ring-foreground/70',
              )}
              style={{ backgroundColor: `#${swatch}` }}
            />
          )
        })}
      </div>

      <input
        value={name}
        onChange={(e) => onNameChange(e.target.value.slice(0, 16))}
        placeholder="Your name"
        className={cn(
          'w-full rounded-2xl border border-foreground/10 bg-foreground/5 px-4 text-center outline-none transition focus:border-foreground/30',
          compact ? 'py-2.5 text-base' : 'py-3 text-lg',
        )}
        onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSubmit?.()}
      />
    </div>
  )
}

/**
 * Where each part's thumbnails look, as a crop of the avatar's 1744-unit frame
 * (centre and width). A whole avatar at this size makes a nose a few pixels,
 * so the face parts are drawn close up and the rest on the head or the figure.
 */
const CROP: Record<AvatarPart, { x: number; y: number; w: number }> = {
  hair: { x: 880, y: 640, w: 1000 },
  eyes: { x: 860, y: 740, w: 520 },
  brows: { x: 870, y: 700, w: 520 },
  lips: { x: 870, y: 900, w: 520 },
  nose: { x: 900, y: 760, w: 520 },
  glasses: { x: 860, y: 740, w: 560 },
  beard: { x: 870, y: 900, w: 640 },
  body: { x: 872, y: 1100, w: 1300 },
  gesture: { x: 872, y: 1000, w: 1744 },
}

/**
 * Glasses hide the eyes, brows and nose they sit on, so those are shown bare.
 * Only the thumbnail: the face itself keeps its glasses.
 */
const SHOWN_BARE: readonly AvatarPart[] = ['eyes', 'brows', 'nose']

const THUMB = 52

/** One part at a time: the parts as tabs, that part's options as faces. */
function PartPicker({
  spec,
  onSpecChange,
}: {
  spec: AvatarSpec
  onSpecChange: (spec: AvatarSpec) => void
}) {
  const [part, setPart] = useState<AvatarPart>('hair')
  const current = useMemo(() => resolvedFeatures(spec), [spec])
  const entry = AVATAR_PARTS.find((p) => p.part === part) ?? AVATAR_PARTS[0]
  const values = useMemo(
    () => (isOptionalPart(part) ? [NO_PART, ...entry.values] : entry.values),
    [part, entry],
  )

  // Every option drawn on this face, so what you tap is what you get. Only the
  // part on show is drawn, and only when the face changes.
  const thumbs = useMemo(
    () =>
      values.map((value) => ({
        value,
        src: avatarCloseUpUri(
          {
            ...spec,
            features: {
              ...spec.features,
              ...(SHOWN_BARE.includes(part) ? { glasses: NO_PART } : {}),
              [part]: value,
            },
          },
          THUMB * 2,
          CROP[part],
        ),
      })),
    [spec, part, values],
  )

  const choose = (value: string) => {
    sound.play('tap')
    onSpecChange({ ...spec, features: { ...spec.features, [part]: value } })
  }

  return (
    <div className="w-full min-w-0">
      <div
        role="tablist"
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {AVATAR_PARTS.map((p) => (
          <button
            key={p.part}
            type="button"
            role="tab"
            aria-selected={p.part === part}
            onClick={() => {
              sound.play('tap')
              setPart(p.part)
            }}
            className={cn(
              'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition',
              p.part === part
                ? 'bg-foreground text-background'
                : 'bg-foreground/5 text-foreground hover:bg-foreground/10',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {thumbs.map(({ value, src }) => {
          const selected = current[part] === value
          const label =
            value === NO_PART
              ? `No ${entry.label.toLowerCase()}`
              : `${entry.label} ${entry.values.indexOf(value) + 1}`
          return (
            <button
              key={value}
              type="button"
              onClick={() => choose(value)}
              aria-label={label}
              aria-pressed={selected}
              className={cn(
                'relative shrink-0 overflow-hidden rounded-full ring-offset-2 ring-offset-background transition active:scale-95',
                selected ? 'ring-2 ring-foreground/70' : 'hover:ring-2 hover:ring-foreground/25',
              )}
              style={{ width: THUMB, height: THUMB }}
            >
              <img
                src={src}
                width={THUMB}
                height={THUMB}
                alt=""
                draggable={false}
                className="size-full"
              />
              {value === NO_PART && (
                <span className="absolute inset-0 flex items-center justify-center bg-background/55 text-3xs font-medium text-foreground">
                  None
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
