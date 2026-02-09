import { BaseLLMJudge, JudgeResult } from '../base-judge'
import { promptRepository } from '../../../prompts/repository'
import { ScoreName } from '../../engine/scores'

export class PersonaFidelityJudge extends BaseLLMJudge {
  name = 'persona-fidelity-judge'
  scoreName: ScoreName = 'magic_score' // Using magic_score as a generic creative bucket for now

  async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
    const content = typeof output === 'string' ? output : JSON.stringify(output)
    const personaInput =
      typeof input === 'object' ? input.persona || input.skill || 'Unknown' : input

    // Fetch Prompt
    const prompt = await promptRepository.getPrompt('persona-fidelity-judge', {
      content,
      persona: personaInput,
    })

    // Call LLM
    const response = await this.callLLM(prompt)

    // Parse
    try {
      const jsonStr = response
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()
      const result = JSON.parse(jsonStr)

      return {
        score: this.normalizeScore((result.score || 0) / 100),
        reason: result.reasoning || 'Persona Fidelity Evaluation',
        scoreName: this.scoreName,
        metadata: {
          persona: personaInput,
          keyTraps: result.keyTraps,
          missedOpportunities: result.missedOpportunities,
        },
      }
    } catch (e) {
      console.error('PersonaFidelityJudge Parse Error:', e)
      return {
        score: 0,
        reason: 'Failed to parse LLM response',
        scoreName: this.scoreName,
      }
    }
  }
}
