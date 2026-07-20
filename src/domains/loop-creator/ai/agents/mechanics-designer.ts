/**
 * Mechanics Designer Agent
 *
 * Creates individual game mechanics with:
 * - Clear inputs and outputs
 * - Balance factors (effort, reward, frequency)
 * - Examples from reference games
 */

import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { LoopCreatorState } from '../../core/graph/state'
import { resolveLoopCreatorModel } from '../../config/model-config'
import {
  buildMechanicsDesignerContext,
  MechanicsDesignerAgentName,
  MechanicsDesignerLog,
  MechanicsDesignerPromptPlaceholder,
  MECHANICS_DESIGNER_NEXT_AGENT,
  parseMechanicsDesignerResponse,
  resolveMechanicsDesignerTask,
} from '../constants/mechanics-designer-wire'
import {
  buildConceptEvaluationNote,
  buildMechanicCanvasActions,
} from '../constants/mechanics-designer-actions-wire'

/**
 * Main mechanics designer agent function
 */
export async function mechanicsDesignerAgent(
  state: LoopCreatorState,
): Promise<Partial<LoopCreatorState>> {
  console.log(MechanicsDesignerLog.Starting)

  const model = new ChatOpenAI({
    modelName: resolveLoopCreatorModel(state.modelConfig?.model),
    temperature: state.modelConfig?.temperature ?? 0.5,
  })

  const task = resolveMechanicsDesignerTask(state)
  const systemPrompt = buildMechanicsDesignerContext(state).replace(
    MechanicsDesignerPromptPlaceholder.Task,
    task,
  )

  const messages = [new SystemMessage(systemPrompt), ...state.messages.slice(-5)]

  console.log(MechanicsDesignerLog.Task, task.slice(0, 100))
  console.log(MechanicsDesignerLog.CallingLlm)

  const response = await model.invoke(messages)

  console.log(MechanicsDesignerLog.LlmResponseReceived)

  const content =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

  console.log(MechanicsDesignerLog.ResponseLength, content.length)

  const parsed = parseMechanicsDesignerResponse(content)

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
