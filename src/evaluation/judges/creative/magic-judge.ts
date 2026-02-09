import { BaseLLMJudge, JudgeResult } from '../base-judge'
import { promptRepository } from '../../../prompts/repository'
import { ScoreName } from '../../engine/scores'

export class MagicJudge extends BaseLLMJudge {
  name = 'magic-judge'
  scoreName: ScoreName = 'magic_score'

  async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
    const content = typeof output === 'string' ? output : JSON.stringify(output)

    // Fetch Prompt
    const prompt = await promptRepository.getPrompt('magic-judge', { content })

    // Call LLM
    const response = await this.callLLM(prompt)

    // Parse
    try {
      const jsonStr = response
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()
      const result = JSON.parse(jsonStr)

      return {
        score: this.normalizeScore((result.overallMagic || 0) / 100),
        reason: result.critique || 'Magic Score Evaluation',
        scoreName: this.scoreName,
        metadata: {
          dimensions: result.dimensions,
          sparks: result.sparks,
          slop: result.slop,
        },
      }
    } catch (e) {
      console.error('MagicJudge Parse Error:', e)
      return {
        score: 0,
        reason: 'Failed to parse LLM response',
        scoreName: this.scoreName,
      }
    }
  }
}
