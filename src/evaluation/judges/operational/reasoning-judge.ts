
import { BaseLLMJudge, JudgeResult } from '../base-judge'
import { promptRepository } from '../../../prompts/repository'
import { ScoreName } from '../../engine/scores'

export class ReasoningJudge extends BaseLLMJudge {
    name = 'reasoning-judge'
    scoreName: ScoreName = 'reasoning_depth'

    async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
        const content = typeof output === 'string' ? output : JSON.stringify(output)

        const prompt = await promptRepository.getPrompt('reasoning-judge', { content })

        const response = await this.callLLM(prompt)

        try {
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim()
            const result = JSON.parse(jsonStr)

            return {
                score: this.normalizeScore(result.score || 0),
                reason: result.reason || 'Reasoning Evaluation',
                scoreName: this.scoreName
            }
        } catch (e) {
            console.error('ReasoningJudge Parse Error:', e)
            return {
                score: 0,
                reason: 'Failed to parse LLM response',
                scoreName: this.scoreName
            }
        }
    }
}
