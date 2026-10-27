'use client'

// The part-by-part avatar picker (pip-web#259), a members' feature.
//
// Its own dialog, as wide as the screen allows, rather than a strip inside
// Edit player (Will, 2026-10-23: the drop-down was cramped and the face was
// hard to see while changing it). The face stays big and in view the whole
// time; the options wrap into a grid that fills whatever width there is.

import { useMemo, useState } from 'react'
import { Shuffle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { PillTabs, ROOMY_DIALOG } from '@/components/ui/picker'
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

export function AvatarCustomiser({
  open,
  onOpenChange,
  spec,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  spec: AvatarSpec
  /** The finished face, handed back to Edit player. Closing any other way keeps the old one. */
  onDone: (spec: AvatarSpec) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={ROOMY_DIALOG}>
        <DialogHeader>
          <DialogTitle>Customise avatar</DialogTitle>
          <DialogDescription>Pick each feature.</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so the draft starts from the face each time. */}
        {open && (
          <Customiser
            initial={spec}
            onCancel={() => onOpenChange(false)}
            onDone={(next) => {
              onDone(next)
              onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
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

/** Drawn at twice the largest size a grid cell reaches, so it stays sharp. */
const THUMB_PX = 192

function Customiser({
  initial,
  onCancel,
  onDone,
}: {
  initial: AvatarSpec
  onCancel: () => void
  onDone: (spec: AvatarSpec) => void
}) {
  const [spec, setSpec] = useState(initial)
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
          THUMB_PX,
          CROP[part],
        ),
      })),
    [spec, part, values],
  )

  const choose = (value: string) => {
    sound.play('tap')
    setSpec({ ...spec, features: { ...spec.features, [part]: value } })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row md:gap-8">
        {/* The face, big and always in view. */}
        <div className="flex shrink-0 flex-col items-center gap-3 md:w-64 md:justify-center">
          <PlayerAvatar spec={spec} size={256} className="size-32 sm:size-40 md:size-56" />
          <div className="flex items-center gap-2">
            {AVATAR_BG_SWATCHES.map((swatch) => {
              const isSelected = spec.backgroundColor === swatch
              return (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => {
                    sound.play('tap')
                    setSpec({ ...spec, backgroundColor: swatch })
                  }}
                  aria-label={AVATAR_BG_SWATCH_NAMES[swatch]}
                  aria-pressed={isSelected}
                  className={cn(
                    'size-6 rounded-full ring-2 ring-transparent transition',
                    isSelected && 'ring-foreground/70',
                  )}
                  style={{ backgroundColor: `#${swatch}` }}
                />
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              sound.play('tap')
              setSpec({ seed: freshSeed(), backgroundColor: spec.backgroundColor })
            }}
            className="flex items-center gap-2 rounded-full bg-foreground/5 px-4 py-1.5 text-sm font-medium text-foreground transition hover:bg-foreground/10 active:scale-95"
          >
            <Shuffle className="size-4" /> Shuffle
          </button>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <PillTabs
            tabs={AVATAR_PARTS.map((p) => ({ id: p.part, label: p.label }))}
            value={part}
            onChange={setPart}
          />
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 py-1">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))]">
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
                      'relative aspect-square w-full overflow-hidden rounded-full ring-offset-2 ring-offset-popover transition active:scale-95',
                      selected
                        ? 'ring-2 ring-foreground/80'
                        : 'hover:ring-2 hover:ring-foreground/25',
                    )}
                  >
                    <img src={src} alt="" draggable={false} className="size-full" />
                    {value === NO_PART && (
                      <span className="absolute inset-0 flex items-center justify-center bg-background/55 text-xs font-medium text-foreground">
                        None
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => {
            sound.play('tap')
            onCancel()
          }}
          className="flex-1 rounded-2xl bg-foreground/[0.06] py-3 font-medium transition hover:bg-foreground/[0.12] md:flex-none md:px-8"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            sound.play('call')
            onDone(spec)
          }}
          className="flex-1 rounded-2xl bg-primary py-3 font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98] md:ml-auto md:flex-none md:px-10"
        >
          Done
        </button>
      </div>
    </div>
  )
}
