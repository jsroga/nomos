
import { BaseLLMJudge, JudgeResult } from '../base-judge'
import { promptRepository } from '../../../prompts/repository'
import { ScoreName } from '../../engine/scores'

export class HallucinationJudge extends BaseLLMJudge {
    name = 'hallucination-judge'
    scoreName: ScoreName = 'hallucination_score'

    async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
        // Prepare variables
        // Reference is passed as 'expected' or 'context' in input
        const reference = expected ? JSON.stringify(expected) : (input.context || '')
        const outputStr = typeof output === 'string' ? output : JSON.stringify(output)

        // Fetch Prompt
        const prompt = await promptRepository.getPrompt('hallucination-judge', {
            reference,
            output: outputStr
        })

        // Call LLM
        const response = await this.callLLM(prompt)

        // Parse
        try {
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim()
            const result = JSON.parse(jsonStr)

            return {
                score: this.normalizeScore(result.score),
                reason: result.reasoning || `Detected ${result.hallucinations?.length || 0} hallucinations`,
                scoreName: this.scoreName
            }
        } catch (e) {
            console.error('HallucinationJudge Parse Error:', e)
            return {
                score: 0,
                reason: 'Failed to parse LLM response',
                scoreName: this.scoreName
            }
        }
    }
}
