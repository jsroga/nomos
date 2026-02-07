
import { BaseLLMJudge, JudgeResult } from '../base-judge'
import { promptRepository } from '../../../prompts/repository'
import { ScoreName } from '../../engine/scores'

export class EmotionalResonanceJudge extends BaseLLMJudge {
    name = 'emotional-judge'
    scoreName: ScoreName = 'emotional_resonance'

    async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
        const content = typeof output === 'string' ? output : JSON.stringify(output)

        // Fetch Prompt
        const prompt = await promptRepository.getPrompt('eq-judge', { content })

        // Call LLM
        const response = await this.callLLM(prompt)

        // Parse
        try {
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim()
            const result = JSON.parse(jsonStr)

            // Calculate Distance if expected provided
            let score = 1
            let reason = 'Emotional Analysis Complete'

            if (expected) {
                // Logic ported from eq-evaluator.ts
                let totalDiff = 0
                let count = 0
                const predicted = result.characters || {}

                for (const char in expected) {
                    if (!predicted[char]) continue
                    for (const emotion in expected[char]) {
                        const target = expected[char][emotion]
                        const actual = predicted[char][emotion] || 0
                        totalDiff += Math.abs(target - actual)
                        count++
                    }
                }

                if (count > 0) {
                    const avgDiff = totalDiff / count
                    score = Math.max(0, 10 - avgDiff) / 10
                    reason = `Avg Diff: ${avgDiff.toFixed(1)}`
                }
            }

            return {
                score: this.normalizeScore(score),
                reason,
                scoreName: this.scoreName,
                metadata: {
                    predicted: result.characters,
                    expected
                }
            }
        } catch (e) {
            console.error('EmotionalResonanceJudge Parse Error:', e)
            return {
                score: 0,
                reason: 'Failed to parse LLM response',
                scoreName: this.scoreName
            }
        }
    }
}
