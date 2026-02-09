import { BaseLLMJudge, JudgeResult } from '../base-judge'
import { promptRepository } from '../../../prompts/repository'
import { ScoreName } from '../../engine/scores'

export class OrchestrationJudge extends BaseLLMJudge {
  name = 'orchestration-judge'
  scoreName: ScoreName = 'orchestration'

  async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
    // Input: Full State + Action
    const state =
      typeof input.state === 'string' ? input.state : JSON.stringify(input.state || input)
    const action = typeof output === 'string' ? output : JSON.stringify(output)
    const protocol =
      typeof expected === 'string'
        ? expected
        : JSON.stringify(expected || 'Standard Workflow Protocol')

    const prompt = await promptRepository.getPrompt('orchestration-judge', {
      state,
      action,
      protocol,
    })

    const response = await this.callLLM(prompt)

    try {
      const jsonStr = response
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()
      const result = JSON.parse(jsonStr)

      return {
        score: this.normalizeScore(result.score || 0),
        reason: result.reason || 'Orchestration Evaluation',
        scoreName: this.scoreName,
      }
    } catch (e) {
      console.error('OrchestrationJudge Parse Error:', e)
      return {
        score: 0,
        reason: 'Failed to parse LLM response',
        scoreName: this.scoreName,
      }
    }
  }
}
