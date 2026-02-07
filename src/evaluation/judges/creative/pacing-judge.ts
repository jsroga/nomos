
import { BaseLLMJudge, JudgeResult } from '../base-judge'
import { promptRepository } from '../../../prompts/repository'
import { ScoreName } from '../../engine/scores'

export class PacingJudge extends BaseLLMJudge {
    name = 'pacing-judge'
    scoreName: ScoreName = 'pacing_score'

    async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
        const content = typeof output === 'string' ? output : JSON.stringify(output)

        // Fetch Prompt
        const prompt = await promptRepository.getPrompt('pacing-judge', { content })

        // Call LLM
        const response = await this.callLLM(prompt)

        // Parse
        try {
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim()
            const result = JSON.parse(jsonStr)

            return {
                score: this.normalizeScore(result.score || 0),
                reason: result.reason || 'Pacing Evaluation',
                scoreName: this.scoreName
            }
        } catch (e) {
            console.error('PacingJudge Parse Error:', e)
            return {
                score: 0,
                reason: 'Failed to parse LLM response',
                scoreName: this.scoreName
            }
        }
    }
}
