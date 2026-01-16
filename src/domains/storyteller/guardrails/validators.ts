import { Validator, ValidationResult } from './runnable-guard'
import { WritersRoomState } from '../graph/state'
import { AgentAction } from '../actions/types'
import { validateUserInput } from './input-guardrails'
import { validateAgentOutput } from './output-guardrails'
import { AgentRole, GuardrailIssue } from './types'
import { checkConsistency, AGENT_GUARDRAILS } from '.'

// ============================================
// INPUT VALIDATORS
// ============================================

export class InputSafetyValidator implements Validator<WritersRoomState> {
  name = 'InputSafety'

  async validate(state: WritersRoomState): Promise<ValidationResult> {
    const messages = state.messages
    if (messages.length === 0) return { isValid: true, issues: [] }

    const lastMessage = messages[messages.length - 1]
    if (lastMessage._getType() !== 'human') return { isValid: true, issues: [] }

    const content =
      typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content)

    // Reuse existing logic
    const result = await validateUserInput(content, state)

    // Map existing blocked result to issues
    const issues: GuardrailIssue[] = [
      ...result.warnings,
      ...(result.blocked ? [result.blocked] : []),
    ]

    return {
      isValid: result.isValid,
      issues,
    }
  }
}

// ============================================
// OUTPUT VALIDATORS
// ============================================

export class OutputSafetyValidator implements Validator<Partial<WritersRoomState>> {
  name = 'OutputSafety'

  constructor(private agentRole: AgentRole) {}

  async validate(
    output: Partial<WritersRoomState>,
    context: { state: WritersRoomState }
  ): Promise<ValidationResult> {
    // Reuse existing logic
    const result = await validateAgentOutput(output, this.agentRole, context.state)

    return {
      isValid: result.isValid,
      issues: result.issues,
    }
  }
}

export class ConsistencyValidator implements Validator<Partial<WritersRoomState>> {
  name = 'Consistency'

  constructor(private agentRole: AgentRole) {}

  async validate(
    output: Partial<WritersRoomState>,
    context: { state: WritersRoomState }
  ): Promise<ValidationResult> {
    const messages = output.messages || []
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage) return { isValid: true, issues: [] }

    // Extract actions
    const actions: AgentAction[] = (lastMessage as any)?.actions || []
    if (actions.length === 0) return { isValid: true, issues: [] }

    const config = AGENT_GUARDRAILS[this.agentRole]
    if (!config) return { isValid: true, issues: [] }

    const result = await checkConsistency(actions, context.state, config.consistencyChecks)

    return {
      isValid: result.isConsistent,
      issues: result.issues,
    }
  }
}
