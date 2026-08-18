import { createScorer } from '@mastra/core/evals'
import { z } from 'zod'
import { inputRecord, normalizeScore, outputToString, toMastraJudgingLanguageModel } from './shared'
import { readNumber, readString, recordFromJson } from '@/shared/data/json-guards'

/**
 * LLM-as-judge: did the assistant achieve a stated conversation goal?
 * Used by Vitest-live chat integration tests — not wired into `evals/run.ts`.
 */

const goalReachedAnalyzeSchema = z.object({
  score: z.number(),
  reasoning: z.string(),
})

const JUDGE_INSTRUCTIONS = [
  'You judge whether an assistant reply achieved a stated conversation goal.',
  'score 1.0 = goal fully met; 0.0 = missed, empty, off-topic, or refused when the goal required an answer.',
  'Respond with valid JSON: { "score": 0-1, "reasoning": "…" }.',
].join('\n')

enum GoalReachedInputField {
  Goal = 'goal',
  Conversation = 'conversation',
  Message = 'message',
  Prompt = 'prompt',
  Value = 'value',
}

export const goalReachedScorer = createScorer({
  id: 'goal-reached',
  name: 'Goal Reached',
  description: 'Whether the assistant achieved the stated conversation goal',
  judge: {
    model: toMastraJudgingLanguageModel(),
    instructions: JUDGE_INSTRUCTIONS,
  },
})
  .analyze({
    description: 'Judge goal achievement from conversation + assistant output',
    outputSchema: goalReachedAnalyzeSchema,
    createPrompt: ({ run }) => {
      const input = inputRecord(run.input)
      // Explicit integration-test shape, or live agent turn (user message = goal).
      const goal =
        String(input[GoalReachedInputField.Goal] ?? '') ||
        String(
          input[GoalReachedInputField.Message] ??
            input[GoalReachedInputField.Prompt] ??
            input[GoalReachedInputField.Value] ??
            ''
        ) ||
        outputToString(run.input)
      const conversation =
        String(input[GoalReachedInputField.Conversation] ?? '') || outputToString(run.input)
      const output = outputToString(run.output)
      return [
        '## Goal',
        goal,
        '',
        '## Conversation',
        conversation,
        '',
        '## Assistant reply to judge',
        output,
      ].join('\n')
    },
  })
  .generateScore(({ results }) => {
    const analyzed = recordFromJson(results.analyzeStepResult)
    return normalizeScore(readNumber(analyzed.score) ?? 0)
  })
  .generateReason(({ results, score }) => {
    const analyzed = recordFromJson(results.analyzeStepResult)
    return readString(analyzed.reasoning) ?? `Goal reached: ${(score * 100).toFixed(0)}%`
  })
