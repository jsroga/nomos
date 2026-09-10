/**
 * Mechanics Designer Agent
 *
 * Creates individual game mechanics with:
 * - Clear inputs and outputs
 * - Balance factors (effort, reward, frequency)
 * - Examples from reference games
 */

import { AIMessage } from '@/shared/chat/core/message'
import { LoopCreatorState } from '../../core/graph/state'
import { runLoopCreatorStructuredCompletion } from './mastra/loop-creator-completion'
import { LoopCreatorMastraAgentId } from './mastra/loop-creator-mastra-agents'
import { MechanicsDesignerOutputSchema } from './schemas/mechanics-designer-output'
import {
  buildMechanicsDesignerContext,
  MechanicsDesignerAgentName,
  MechanicsDesignerLog,
  MechanicsDesignerPromptPlaceholder,
  MECHANICS_DESIGNER_NEXT_AGENT,
  parseMechanicsDesignerResponse,
  resolveMechanicsDesignerTask,
} from '../utils/mechanics-designer-wire'
import {
  buildConceptEvaluationNote,
  buildMechanicCanvasActions,
} from '../utils/mechanics-designer-actions-wire'

/**
 * Main mechanics designer agent function
 */
export async function mechanicsDesignerAgent(
  state: LoopCreatorState,
): Promise<Partial<LoopCreatorState>> {
  console.log(MechanicsDesignerLog.Starting)

  const task = resolveMechanicsDesignerTask(state)
  const systemPrompt = buildMechanicsDesignerContext(state).replace(
    MechanicsDesignerPromptPlaceholder.Task,
    task,
  )

  console.log(MechanicsDesignerLog.Task, task.slice(0, 100))
  console.log(MechanicsDesignerLog.CallingLlm)

  const output = await runLoopCreatorStructuredCompletion({
    scope: state.scope,
    agentId: LoopCreatorMastraAgentId.MechanicsDesigner,
    systemPrompt,
    history: state.messages.slice(-5),
    temperature: state.modelConfig?.temperature ?? 0.5,
    modelOverride: state.modelConfig?.model,
    schema: MechanicsDesignerOutputSchema,
  })

  console.log(MechanicsDesignerLog.LlmResponseReceived)

  const parsed = parseMechanicsDesignerResponse(output)

  console.log(
    `${MechanicsDesignerLog.CreatedSummary}${parsed.mechanics.length}${MechanicsDesignerLog.MechanicsWord}${parsed.connections.length}${MechanicsDesignerLog.ConnectionsWord}`,
  )

  const actions = buildMechanicCanvasActions(parsed.mechanics, parsed.connections, parsed.analysis)
  const evaluationNote = await buildConceptEvaluationNote(state, parsed.mechanics)

  return {
    mechanics: parsed.mechanics,
    connections: parsed.connections,
    pendingActions: actions,
    nextAgent: MECHANICS_DESIGNER_NEXT_AGENT,
    messages: [
      new AIMessage({
        content:
          (parsed.message ||
            `Created ${parsed.mechanics.length} mechanics with ${parsed.connections.length} connections.`) +
          evaluationNote,
        name: MechanicsDesignerAgentName.MechanicsDesigner,
      }),
    ],
  }
}
