
import { BaseLLMJudge, JudgeResult } from '../base-judge'
import { promptRepository } from '../../../prompts/repository'
import { ScoreName } from '../../engine/scores'

export class SelfCorrectionJudge extends BaseLLMJudge {
    name = 'self-correction-judge'
    scoreName: ScoreName = 'self_correction'

    async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
        // Output is assumed to be an object with { draft, revision, critique }
        // Or input has it.
        const data = output || input || {}
        const draft = typeof data.draft === 'string' ? data.draft : JSON.stringify(data.draft || '')
        const revision = typeof data.revision === 'string' ? data.revision : JSON.stringify(data.revision || '')
        const critique = typeof data.critique === 'string' ? data.critique : JSON.stringify(data.critique || 'Improve this.')

        const prompt = await promptRepository.getPrompt('correction-judge', {
            draft,
            revision,
            critique
        })

        const response = await this.callLLM(prompt)

        try {
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim()
            const result = JSON.parse(jsonStr)

            return {
                score: this.normalizeScore(result.score || 0),
                reason: result.reason || 'Self Correction Evaluation',
                scoreName: this.scoreName
            }
        } catch (e) {
            console.error('SelfCorrectionJudge Parse Error:', e)
            return {
                score: 0,
                reason: 'Failed to parse LLM response',
                scoreName: this.scoreName
            }
        }
    }
}
