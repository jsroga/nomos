import { BaseLLMJudge, JudgeResult } from '../base-judge'
import { promptRepository } from '../../../prompts/repository'
import { ScoreName } from '../../engine/scores'

export class ReverseIntentJudge extends BaseLLMJudge {
  name = 'reverse-intent-judge'
  scoreName: ScoreName = 'fidelity_score'

  async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
    const content = typeof output === 'string' ? output : JSON.stringify(output)
    const prompt = await promptRepository.getPrompt('reverse-intent-judge', { content })
    const response = await this.callLLM(prompt)
    try {
      const result = JSON.parse(
        response
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim()
      )
      return {
        score: this.normalizeScore(result.score || 0),
        reason: result.reason,
        scoreName: this.scoreName,
        metadata: { intent: result.intent },
      }
    } catch (e) {
      return { score: 0, reason: 'Parse Error', scoreName: this.scoreName }
    }
  }
}

class MultiHopEmpathyJudge extends BaseLLMJudge {
  name = 'multi-hop-judge'
  scoreName: ScoreName = 'empathy_score'

  async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
    const content = typeof output === 'string' ? output : JSON.stringify(output)
    const prompt = await promptRepository.getPrompt('multi-hop-judge', { content })
    const response = await this.callLLM(prompt)
    try {
      const result = JSON.parse(
        response
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim()
      )
      return {
        score: this.normalizeScore(result.score || 0),
        reason: result.reason,
        scoreName: this.scoreName,
      }
    } catch (e) {
      return { score: 0, reason: 'Parse Error', scoreName: this.scoreName }
    }
  }
}

class LongHorizonArcJudge extends BaseLLMJudge {
  name = 'arc-judge'
  scoreName: ScoreName = 'arc_consistency'

  async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
    const content = typeof output === 'string' ? output : JSON.stringify(output)
    const prompt = await promptRepository.getPrompt('arc-judge', { content })
    const response = await this.callLLM(prompt)
    try {
      const result = JSON.parse(
        response
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim()
      )
      return {
        score: this.normalizeScore(result.score || 0),
        reason: result.reason,
        scoreName: this.scoreName,
      }
    } catch (e) {
      return { score: 0, reason: 'Parse Error', scoreName: this.scoreName }
    }
  }
}
