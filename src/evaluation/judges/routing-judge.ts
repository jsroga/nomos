import { BaseJudge, JudgeResult } from './base-judge'
import { ScoreName } from '../engine/scores'

export class RoutingJudge extends BaseJudge {
  name = 'RoutingJudge'
  scoreName = ScoreName.ROUTING_ACCURACY

  async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
    // Output is expected to be a Mastra CoPilotInteraction or similar
    // Structure: { type: 'tool-call' | 'response', ... }

    const outputType = output?.type
    const toolCalled = output?.toolName // Assuming Mastra interaction has toolName

    // 1. Strict Deterministic Match (if expected is provided)
    if (expected && expected.toolName) {
      const isMatch = toolCalled === expected.toolName
      return {
        score: isMatch ? 1 : 0,
        scoreName: this.scoreName,
        reason: isMatch
          ? `Correctly called tool '${toolCalled}'`
          : `Expected tool '${expected.toolName}', but called '${toolCalled || 'none'}'`,
      }
    }

    if (expected && expected.expectedAgents) {
      // Backward compatibility with legacy expectations
      // Check if tool name maps to agent
      // For now, heuristic fallback
      const matched = expected.expectedAgents.some((agent: string) =>
        (toolCalled || '').toLowerCase().includes(agent.toLowerCase())
      )
      return {
        score: matched ? 1 : 0,
        scoreName: this.scoreName,
        reason: matched
          ? `Tool '${toolCalled}' matches expected agents`
          : `Tool '${toolCalled}' does not match expected agents [${expected.expectedAgents.join(',')}]`,
      }
    }

    // 2. Fallback: LLM Judge (Future Phase)
    // For now, if no expectation, we assume valid if *any* tool was called when input implies action
    if (input.message && (input.message.includes('plan') || input.message.includes('create'))) {
      if (!toolCalled) {
        return {
          score: 0.5,
          reason: 'Input implied action but no tool was called (Heuristic)',
          scoreName: this.scoreName,
        }
      }
    }

    return {
      score: 1,
      reason: 'No strict expectation provided, default pass',
      scoreName: this.scoreName,
    }
  }
}
