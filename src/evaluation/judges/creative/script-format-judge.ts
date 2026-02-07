
import { BaseLLMJudge, JudgeResult } from '../base-judge'
import { promptRepository } from '../../../prompts/repository'
import { ScoreName } from '../../engine/scores'

export class ScriptFormatJudge extends BaseLLMJudge {
    name = 'script-format-judge'
    scoreName: ScoreName = 'script_format'

    async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
        const content = typeof output === 'string' ? output : JSON.stringify(output)

        // Fetch Prompt
        const prompt = await promptRepository.getPrompt('script-format-judge', { content })

        // Call LLM
        const response = await this.callLLM(prompt)

        // Parse
        try {
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim()
            const result = JSON.parse(jsonStr)

            return {
                score: this.normalizeScore(result.score || 0),
                reason: result.reason || 'Script Format Evaluation',
                scoreName: this.scoreName
            }
        } catch (e) {
            console.error('ScriptFormatJudge Parse Error:', e)
            return {
                score: 0,
                reason: 'Failed to parse LLM response',
                scoreName: this.scoreName
            }
        }
    }
}
