
import { BaseLLMJudge, JudgeResult } from '../base-judge'
import { promptRepository } from '../../../prompts/repository'
import { ScoreName } from '../../engine/scores'

export class CitationFormatJudge extends BaseLLMJudge {
    name = 'citation-format-judge'
    scoreName: ScoreName = 'citation_accuracy'

    async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
        // Output is the text to check
        const text = typeof output === 'string' ? output : JSON.stringify(output)

        // Fetch Prompt
        const prompt = await promptRepository.getPrompt('citation-judge', { text })

        // Call LLM
        const response = await this.callLLM(prompt)

        // Parse
        try {
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim()
            const result = JSON.parse(jsonStr)

            return {
                score: this.normalizeScore(result.score),
                reason: result.summary + ` (${result.citations?.length || 0} citations checked)`,
                scoreName: this.scoreName
            }
        } catch (e) {
            console.error('CitationFormatJudge Parse Error:', e)
            return {
                score: 0,
                reason: 'Failed to parse LLM response',
                scoreName: this.scoreName
            }
        }
    }
}
