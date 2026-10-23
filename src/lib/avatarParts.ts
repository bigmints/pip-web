// The parts of a notionists face a member can choose one by one (pip-web#259).
//
// Kept apart from lib/avatar for the reason FILL_SWATCHES is: the room server
// checks an avatar it is sent against this list, and has no use for the
// renderer that lib/avatar pulls in. Only a type comes from DiceBear here.

import type { notionists } from '@dicebear/collection'

/** A part that can be picked, in the order the editor shows them. */
export type AvatarPart =
  | 'hair'
  | 'eyes'
  | 'brows'
  | 'lips'
  | 'nose'
  | 'glasses'
  | 'beard'
  | 'body'
  | 'gesture'

/** The parts a face can go without. `NO_PART` is that choice. */
export const OPTIONAL_PARTS = ['glasses', 'beard', 'gesture'] as const

/** "Without one" for an optional part, stored as a value like any other. */
export const NO_PART = 'none'

/**
 * The choices a member has made, part by part.
 *
 * **Absent means the seed decides**, so an avatar from before this existed, or
 * a part nobody touched, draws exactly as it always has. A part's value is one
 * of `AVATAR_PARTS[part].values`, or `NO_PART` for an optional one.
 */
export type AvatarFeatures = Partial<Record<AvatarPart, string>>

const variants = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => `variant${String(i + 1).padStart(2, '0')}`)

type NotionistsOptions = Parameters<typeof notionists.create>[0]['options']
type PartValues = { [P in AvatarPart]: NonNullable<NotionistsOptions[P]> }

/**
 * Every value DiceBear will draw for each part, cast to its own option types so
 * a value can be handed straight to it. tests/avatar.test.ts draws each one, so
 * a value it does not know cannot be offered.
 */
const VALUES = {
  hair: [...variants(63), 'hat'],
  eyes: variants(5),
  brows: variants(13),
  lips: variants(30),
  nose: variants(20),
  glasses: variants(11),
  beard: variants(12),
  body: variants(25),
  gesture: [
    'hand',
    'handPhone',
    'ok',
    'okLongArm',
    'point',
    'pointLongArm',
    'waveLongArm',
    'waveLongArms',
    'waveOkLongArms',
    'wavePointLongArms',
  ],
} as PartValues

export const AVATAR_PARTS: readonly {
  part: AvatarPart
  label: string
  values: readonly string[]
}[] = [
  { part: 'hair', label: 'Hair', values: VALUES.hair },
  { part: 'eyes', label: 'Eyes', values: VALUES.eyes },
  { part: 'brows', label: 'Brows', values: VALUES.brows },
  { part: 'lips', label: 'Mouth', values: VALUES.lips },
  { part: 'nose', label: 'Nose', values: VALUES.nose },
  { part: 'glasses', label: 'Glasses', values: VALUES.glasses },
  { part: 'beard', label: 'Beard', values: VALUES.beard },
  { part: 'body', label: 'Top', values: VALUES.body },
  { part: 'gesture', label: 'Hands', values: VALUES.gesture },
]

export function isOptionalPart(part: AvatarPart): boolean {
  return (OPTIONAL_PARTS as readonly string[]).includes(part)
}

/**
 * Features read from anywhere untrusted — another player, a hand link, a
 * restored file. Anything unknown is dropped rather than refused: a stale or
 * hand-edited part falls back to the seed, and the face still draws.
 */
export function parseFeatures(v: unknown): AvatarFeatures | undefined {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return undefined
  const out: AvatarFeatures = {}
  for (const { part, values } of AVATAR_PARTS) {
    const value = (v as Record<string, unknown>)[part]
    if (typeof value !== 'string') continue
    if (values.includes(value) || (value === NO_PART && isOptionalPart(part))) out[part] = value
  }
  return Object.keys(out).length > 0 ? out : undefined
}
