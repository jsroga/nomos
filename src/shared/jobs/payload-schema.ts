/**
 * Helpers for task payload schemas.
 *
 * A payload often carries a type another module owns — a tile's neighbours, a
 * crop spec. Mirroring those field by field produces a second declaration that
 * drifts from the first, so they are carried through as opaque instead: the
 * boundary validates what it owns and states what it does not.
 */
import { z } from 'zod'

/** Present, but not mirrored — the declaring module owns its shape. */
export function ownedElsewhere<T>(): z.ZodType<T> {
  return z.custom<T>(value => value !== undefined && value !== null)
}
