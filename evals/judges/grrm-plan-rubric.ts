import { createScorer } from '@mastra/core/evals'
import { recordFromJson, readString, stringArrayFromJson } from '../../src/shared/data/json-guards'

export enum GrrmPlanRubricScorerId {
  GrrmPlanRubric = 'grrm-plan-rubric',
}

export interface GrrmPlanRubricInput {
  goal: string
  conflict: string
  turn: string
  dialogueHook: string
  charactersInvolved: string[]
}

const DUMP_PHRASES = ['the truth is', 'secretly i', 'i am the one who', 'let me explain']
const BODY_WORDS = ['hand', 'finger', 'look', 'slide', 'tremble', 'door', 'seal', 'ash', 'candle', 'blood']
const SENSORY_WORDS = ['cold', 'wet', 'iron', 'dust', 'smoke', 'salt', 'candle', 'ash', 'blood', 'rain']

function containsAny(haystack: string, needles: readonly string[]): boolean {
  const lower = haystack.toLowerCase()
  return needles.some(needle => lower.includes(needle))
}

function mentionsOtherCast(text: string, involved: readonly string[]): boolean {
  const lead = involved[0]?.toLowerCase()
  const lower = text.toLowerCase()
  return involved.some(name => {
    const key = name.toLowerCase()
    if (key.length === 0 || key === lead) return false
    return lower.includes(key)
  })
}

function lawOfMotionComplete(plan: GrrmPlanRubricInput): boolean {
  const goal = plan.goal.trim()
  const conflict = plan.conflict.trim()
  const turn = plan.turn.trim()
  if (goal.length === 0 || conflict.length === 0 || turn.length === 0) return false
  return goal !== conflict && conflict !== turn && goal !== turn
}

export function scoreGrrmPlanRubric(plan: GrrmPlanRubricInput): {
  id: GrrmPlanRubricScorerId
  score: number
  axes: Record<string, number>
} {
  const axes = {
    politicalRelationalConsequence:
      plan.charactersInvolved.length >= 2 &&
      (mentionsOtherCast(plan.conflict, plan.charactersInvolved) ||
        mentionsOtherCast(plan.turn, plan.charactersInvolved))
        ? 1
        : 0,
    embodiedDialogue: containsAny(plan.dialogueHook, BODY_WORDS) ? 1 : 0,
    withheldAuthorTruth: containsAny(plan.dialogueHook, DUMP_PHRASES) ? 0 : 1,
    sensoryDensity: containsAny(`${plan.goal} ${plan.conflict} ${plan.turn}`, SENSORY_WORDS) ? 1 : 0,
    lawOfMotionCompleteness: lawOfMotionComplete(plan) ? 1 : 0,
  }
  const values = Object.values(axes)
  const score = values.reduce((sum, value) => sum + value, 0) / values.length
  return { id: GrrmPlanRubricScorerId.GrrmPlanRubric, score, axes }
}

function planFromUnknown(value: unknown): GrrmPlanRubricInput {
  const row = recordFromJson(value)
  return {
    goal: readString(row.goal) ?? '',
    conflict: readString(row.conflict) ?? '',
    turn: readString(row.turn) ?? '',
    dialogueHook: readString(row.dialogueHook) ?? '',
    charactersInvolved: stringArrayFromJson(row.charactersInvolved),
  }
}

export const grrmPlanRubricScorer = createScorer({
  id: GrrmPlanRubricScorerId.GrrmPlanRubric,
  name: 'GRRM Plan Rubric',
  description:
    'Plans only: political/relational consequence, embodied dialogue, withheld author-truth, sensory density, Law of Motion completeness',
})
  .generateScore(({ run }) => scoreGrrmPlanRubric(planFromUnknown(run.output)).score)
  .generateReason(({ run }) => JSON.stringify(scoreGrrmPlanRubric(planFromUnknown(run.output)).axes))
