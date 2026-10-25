'use client'

// The parts of a roomy picker: a dialog as wide as the screen allows, and the
// pill tabs along the top of its options. Shared by the avatar Customise and
// the Chip Shop, so a picker with many options looks the same wherever it is.

import { sound } from '@/lib/sound'
import { cn } from '@/lib/utils'

/**
 * `DialogContent` sizing for a picker with a big preview: nearly the whole
 * screen on a phone, a wide box with a height cap on anything larger.
 */
export const ROOMY_DIALOG =
  'h-[calc(100dvh-2rem)] sm:h-[min(44rem,calc(100dvh-2rem))] sm:max-w-[min(64rem,calc(100%-2rem))]'

/**
 * A row of pill tabs. Scrolls sideways on a phone with the scrollbar hidden,
 * and wraps on a desktop where there is room for all of them.
 */
export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: readonly { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={cn(
        '-mx-1 flex shrink-0 gap-1.5 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === value}
          onClick={() => {
            sound.play('tap')
            onChange(tab.id)
          }}
          className={cn(
            'shrink-0 rounded-full px-3.5 py-1.5 text-sm md:px-3 font-medium transition active:scale-95',
            tab.id === value
              ? 'bg-foreground text-background'
              : 'bg-foreground/5 text-foreground hover:bg-foreground/10',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
