
import { BaseLLMJudge, JudgeResult } from '../base-judge'
import { promptRepository } from '../../../prompts/repository'
import { ScoreName } from '../../engine/scores'

export class RetrievalRelevanceJudge extends BaseLLMJudge {
    name = 'retrieval-relevance-judge'
    scoreName: ScoreName = 'retrieval_relevance'

    async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
        // Output assumed to be the retrieved document or chunk
        const document = typeof output === 'string' ? output : JSON.stringify(output)
        // Input assumed to be the query
        const query = typeof input === 'string' ? input : (input.query || JSON.stringify(input))

        // Fetch Prompt
        const prompt = await promptRepository.getPrompt('retrieval-judge', {
            query,
            document
        })

        // Call LLM
        const response = await this.callLLM(prompt)

        // Parse
        try {
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim()
            const result = JSON.parse(jsonStr)

            return {
                score: this.normalizeScore(result.score),
                reason: result.reason || 'No reasoning provided',
                scoreName: this.scoreName
            }
        } catch (e) {
            console.error('RetrievalRelevanceJudge Parse Error:', e)
            return {
                score: 0,
                reason: 'Failed to parse LLM response',
                scoreName: this.scoreName
            }
        }
    }
}
