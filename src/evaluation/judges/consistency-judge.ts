import { BaseLLMJudge, JudgeResult } from './base-judge'
import { ScoreName } from '../engine/scores'

export class ConsistencyJudge extends BaseLLMJudge {
  name = 'ConsistencyJudge'
  scoreName = ScoreName.CONSISTENCY

  async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
    // In the future, this calls the LLM.
    // For migration phase 3.0, we use a simple heuristic placeholder OR specific "conflict check" if provided.

    const facts = input.facts || []
    const text = typeof output === 'string' ? output : JSON.stringify(output)

    // Placeholder matching legacy "dead/alive" check logic for demonstration
    // Requires LLM to be fully functional
    const conflicts: string[] = []
    if (text.toLowerCase().includes('alive') && facts.some((f: string) => f.includes('dead'))) {
      conflicts.push('Character is dead but described as alive')
    }

    if (conflicts.length > 0) {
      return {
        score: 0,
        scoreName: this.scoreName,
        reason: `Consistency violations found: ${conflicts.join(', ')}`,
      }
    }

    return {
      score: 1,
      scoreName: this.scoreName,
      reason: 'No obvious inconsistencies found (Heuristic)',
    }
  }
}
