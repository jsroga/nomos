
import { BaseLLMJudge, JudgeResult } from '../base-judge'
import { promptRepository } from '../../../prompts/repository'
import { ScoreName } from '../../engine/scores'

export class ToxicLanguageJudge extends BaseLLMJudge {
    name = 'toxicity-judge'
    scoreName: ScoreName = 'safety'

    async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
        const content = typeof output === 'string' ? output : JSON.stringify(output)

        // Fetch Prompt
        const prompt = await promptRepository.getPrompt('toxicity-judge', { content })

        // Call LLM
        const response = await this.callLLM(prompt)

        // Parse
        try {
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim()
            const result = JSON.parse(jsonStr)

            // Score = 1 if safe
            const score = result.safe ? 1 : Math.max(0, 1 - (result.severity || 5) / 10)

            return {
                score: this.normalizeScore(score),
                reason: result.safe
                    ? 'No toxicity detected'
                    : `Issues: ${result.issues?.join(', ')}`,
                scoreName: this.scoreName,
                metadata: {
                    issues: result.issues,
                    severity: result.severity
                }
            }
        } catch (e) {
            console.error('ToxicLanguageJudge Parse Error:', e)
            return {
                score: 0,
                reason: 'Failed to parse LLM response',
                scoreName: this.scoreName
            }
        }
    }
}
