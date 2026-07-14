/**
 * WildIdea schema (PLAN-V2 5.2) — the Muse's output unit.
 *
 * Every idea must be an ACTION: someone does something irreversible. The
 * schema descriptions push the model there; the deterministic post-filter in
 * brainstorm.ts enforces it (vague-phrase ban + verb-of-consequence check).
 *
 * Pure module (zod only) — importable by evals and tests without the server
 * guard, same cycle-safety rules as beat-plan-schema.
 */

import { z } from 'zod'

export const WildIdeaSchema = z.object({
  hook: z
    .string()
    .min(1)
    .describe(
      'One sentence: WHO does WHAT irreversible thing. A concrete on-screen action — never a mood, never a theme.'
    ),
  mechanism: z
    .string()
    .min(1)
    .describe(
      'How the dealt craft mechanism and constraint cards produce this action (name the object, the countdown, the venue property used).'
    ),
  collision: z
    .string()
    .min(1)
    .describe(
      'What existing story element this idea collides with, and what the collision breaks or forces.'
    ),
})

export const WildIdeaBatchSchema = z.object({
  ideas: z.array(WildIdeaSchema).min(3).max(5),
})

export type WildIdea = z.infer<typeof WildIdeaSchema>
export type WildIdeaBatch = z.infer<typeof WildIdeaBatchSchema>
