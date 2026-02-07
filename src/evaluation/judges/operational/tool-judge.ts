
import { BaseLLMJudge, JudgeResult } from '../base-judge'
import { promptRepository } from '../../../prompts/repository'
import { ScoreName } from '../../engine/scores'

export class ToolUsageJudge extends BaseLLMJudge {
    name = 'tool-usage-judge'
    scoreName: ScoreName = 'tool_usage'

    async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
        const inputStr = typeof input === 'string' ? input : JSON.stringify(input)
        const outputStr = typeof output === 'string' ? output : JSON.stringify(output)
        const expectedStr = expected ? (typeof expected === 'string' ? expected : JSON.stringify(expected)) : 'Successful execution'

        const prompt = await promptRepository.getPrompt('tool-usage-judge', {
            input: inputStr,
            output: outputStr,
            expected: expectedStr
        })

        const response = await this.callLLM(prompt)

        try {
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim()
            const result = JSON.parse(jsonStr)

            return {
                score: this.normalizeScore(result.score || 0),
                reason: result.reason || 'Tool Usage Evaluation',
                scoreName: this.scoreName
            }
        } catch (e) {
            console.error('ToolUsageJudge Parse Error:', e)
            return {
                score: 0,
                reason: 'Failed to parse LLM response',
                scoreName: this.scoreName
            }
        }
    }
}
