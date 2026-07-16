/**
 * Beat-plan concreteness gate (PLAN-FOLLOW-UP item 35).
 *
 * A vague plan poisons everything downstream — the author drafts mush and the
 * critics can only diagnose mush. The gate post-validates the planner's
 * goal/conflict/turn BEFORE drafting: length floor, banned-vagueness phrases,
 * and a must-name-a-character check. The workflow retries the planner ONCE
 * with the failures named; a second failure passes through flagged
 * (`planWarnings` in the verdict suspend payload) rather than erroring the run.
 *
 * Pure module (zod-free) — same cycle-safety rules as beat-plan-schema.
 */

import type { BeatPlan } from './beat-plan-schema'
import { BEAT_PLAN_VAGUE_PHRASES } from '@/domains/storyteller/ai/prompts/guardrails/anti-slop-phrases'
import {
  BEAT_PLAN_GATED_FIELDS,
  LIST_JOIN_SEPARATOR,
} from '@/domains/storyteller/ai/agents/BeatPlanner/constants/beat-plan-quality'

/** Below this many characters a goal/conflict/turn cannot be concrete. */
const MIN_FIELD_LENGTH = 25

export interface PlanQualityResult {
  ok: boolean
  /** Human-readable failures, written to be pasted into a retry prompt. */
  failures: string[]
}

export function assessBeatPlanConcreteness(
  plan: BeatPlan,
  availableCharacters: string[] = []
): PlanQualityResult {
  const failures: string[] = []

  for (const field of BEAT_PLAN_GATED_FIELDS) {
    const value = plan[field].trim()
    if (value.length < MIN_FIELD_LENGTH) {
      failures.push(
        `${field} is too thin (${value.length} chars): "${value}" — state a concrete, script-visible ${field} in at least one full sentence.`
      )
      continue
    }
    const lower = value.toLowerCase()
    for (const phrase of BEAT_PLAN_VAGUE_PHRASES) {
      if (lower.includes(phrase)) {
        failures.push(
          `${field} leans on the vague phrase "${phrase}": "${value}" — replace it with the specific event, object, or line that happens on screen.`
        )
      }
    }
  }

  const names = [...new Set([...plan.charactersInvolved, ...availableCharacters])].filter(
    name => name.trim().length > 0
  )
  if (names.length > 0) {
    const combined = BEAT_PLAN_GATED_FIELDS.map(field => plan[field]).join(' ').toLowerCase()
    const named = names.some(name => combined.includes(name.toLowerCase()))
    if (!named) {
      failures.push(
        `None of goal/conflict/turn names a character (available: ${names.join(LIST_JOIN_SEPARATOR)}) — anchor the beat to who acts and who opposes.`
      )
    }
  }

  return { ok: failures.length === 0, failures }
}

/** Failures rendered for the planner's single retry prompt. */
export function formatPlanQualityFeedback(failures: string[]): string {
  return failures.map(failure => `- ${failure}`).join('\n')
}
