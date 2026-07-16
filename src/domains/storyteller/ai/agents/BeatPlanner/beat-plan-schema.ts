/**
 * Beat plan structured output schema (no z.any() — hard constraint).
 *
 * Pure module (zod only) so the workflow contract, the planner agent, and
 * the author can all import it without touching the Mastra kernel — keeps
 * the tools-barrel ↔ runtime-registration import cycle initialization-safe.
 */

import { z } from 'zod'

export const BeatPlanSchema = z.object({
  goal: z.string().min(1).describe('What the protagonist wants to achieve in this beat'),
  conflict: z.string().min(1).describe('What obstacle/antagonist opposes the goal'),
  turn: z.string().min(1).describe('The unexpected twist or decision point'),
  dialogueHook: z.string().min(1).describe('The opening line or key exchange that kicks off the beat'),
  charactersInvolved: z.array(z.string()).min(1).describe('List of character names present in this beat'),
  emotionalTarget: z.string().optional().describe('Target emotional state for the audience'),
  setupPayoff: z
    .object({
      setupFor: z.string().optional().describe('What future beat this sets up'),
      payoffFrom: z.string().optional().describe('What earlier beat this pays off'),
    })
    .optional(),
})

export type BeatPlan = z.infer<typeof BeatPlanSchema>
