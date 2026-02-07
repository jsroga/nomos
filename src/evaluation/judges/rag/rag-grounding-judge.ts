
import { BaseLLMJudge, JudgeResult } from '../base-judge'
import { promptRepository } from '../../../prompts/repository'
import { ScoreName } from '../../engine/scores'

export class RagGroundingJudge extends BaseLLMJudge {
    name = 'rag-grounding-judge'
    scoreName: ScoreName = 'rag_grounding_score'

    async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
        // Prepare variables
        const variables = {
            input: JSON.stringify(input),
            output: typeof output === 'string' ? output : JSON.stringify(output),
            reference: JSON.stringify(expected || {}) // RAG reference passed as expected
        }

        // Fetch Prompt
        const prompt = await promptRepository.getPrompt('rag-grounding-judge', variables)

        // Call LLM
        const response = await this.callLLM(prompt)

        // Parse
        try {
            // Clean markdown
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim()
            const result = JSON.parse(jsonStr)

            return {
                score: this.normalizeScore(result.score),
                reason: result.reasoning || 'No reasoning provided',
                scoreName: this.scoreName
            }
        } catch (e) {
            console.error('RagGroundingJudge Parse Error:', e)
            return {
                score: 0,
                reason: 'Failed to parse LLM response',
                scoreName: this.scoreName
            }
        }
    }
}
