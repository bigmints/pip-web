'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Lock, Shuffle, SlidersHorizontal } from 'lucide-react'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { AvatarCustomiser } from '@/components/profile/AvatarCustomiser'
import { membershipFor } from '@/config/membership'
import {
  AVATAR_BG_SWATCH_NAMES,
  AVATAR_BG_SWATCHES,
  freshSeed,
  type AvatarSpec,
} from '@/lib/avatar'
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
  const [lockShown, setLockShown] = useState(false)

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
              if (member) setOpen(true)
              else setLockShown((shown) => !shown)
            }}
            className={cn(
              'flex items-center gap-2 rounded-full bg-foreground/5 px-4 text-sm font-medium text-foreground transition hover:bg-foreground/10 active:scale-95',
              compact ? 'py-1.5' : 'py-2',
            )}
          >
            {member ? <SlidersHorizontal className="size-4" /> : <Lock className="size-4" />}
            Customise
          </button>
        )}
      </div>

      {customise && member && (
        <AvatarCustomiser open={open} onOpenChange={setOpen} spec={spec} onDone={onSpecChange} />
      )}

      {customise && !member && lockShown && (
        <p className="text-center text-sm text-muted-foreground">
          Picking each feature comes with the membership.{' '}
          <Link
            href={membershipFor('avatar')}
            onClick={() => sound.play('tap')}
            className="font-medium text-foreground underline underline-offset-2"
          >
            Membership
          </Link>
        </p>
      )}

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
