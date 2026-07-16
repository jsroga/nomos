import { createScorer } from '@mastra/core/evals'
import { BeatPlanSchema } from './beat-plan-schema'
import { assessBeatPlanConcreteness } from './beat-plan-quality'

/**
 * Deterministic eval scorer over the beat-plan concreteness gate (item 35/36).
 * Lives in the domain (not `shared/agent-kernel/scorers`) because the gate and
 * schema are domain modules and shared/ may not import domains; the eval
 * runner unions it with the shared scorers.
 *
 * 0 — output is not valid BeatPlan JSON (planner leaked prose or broke schema).
 * 1 — valid plan that passes the gate; each surviving failure costs 0.25.
 */

function parsePlanOutput(output: unknown): ReturnType<typeof BeatPlanSchema.safeParse> | null {
  const text = typeof output === 'string' ? output : JSON.stringify(output)
  try {
    return BeatPlanSchema.safeParse(JSON.parse(text))
  } catch {
    return null
  }
}

export const beatPlanConcretenessScorer = createScorer({
  id: 'beat-plan-concreteness',
  name: 'Beat Plan Concreteness',
  description:
    'Deterministic: output must be valid BeatPlan JSON (no prose leak) and pass the concreteness gate (length floor, no vagueness phrases, names a character).',
})
  .generateScore(({ run }) => {
    const parsed = parsePlanOutput(run.output)
    if (!parsed?.success) return 0
    const quality = assessBeatPlanConcreteness(parsed.data)
    return quality.ok ? 1 : Math.max(0, 1 - 0.25 * quality.failures.length)
  })
  .generateReason(({ run, score }) => {
    const parsed = parsePlanOutput(run.output)
    if (!parsed) return `Score ${score.toFixed(2)} — output is not JSON (planner leaked prose).`
    if (!parsed.success) return `Score ${score.toFixed(2)} — JSON does not match BeatPlanSchema.`
    const quality = assessBeatPlanConcreteness(parsed.data)
    return quality.ok
      ? `Score ${score.toFixed(2)} — plan passes the concreteness gate.`
      : `Score ${score.toFixed(2)} — gate failures: ${quality.failures.join(' | ')}`
  })
