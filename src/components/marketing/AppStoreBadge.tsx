'use client'

import { APP_STORE_URL } from '@/config/site'
import { inApp } from '@/lib/nativeApp'
import { useHydrated } from '@/lib/useHydrated'
import { cn } from '@/lib/utils'

/**
 * Apple's own "Download on the App Store" badge, linking to the listing. The
 * artwork is Apple's file, unedited, as their marketing guidelines ask.
 *
 * Furniture, never a prompt: it sits where it is and counts nothing. It waits
 * for hydration because the store app's bridge only exists in the browser, and
 * someone already in the app has no use for a link to download it.
 */
export function AppStoreBadge({ className }: { className?: string }) {
  const hydrated = useHydrated()
  if (!hydrated || inApp()) return null
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noreferrer"
      className={cn('inline-block transition hover:opacity-80', className)}
    >
      <img
        src="/badges/app-store.svg"
        alt="Download on the App Store"
        width={120}
        height={40}
        className="h-10 w-auto"
      />
    </a>
  )
}
