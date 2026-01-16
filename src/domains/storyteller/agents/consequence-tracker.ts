import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { WritersRoomState } from '../graph/state'
import { AgentAction } from '../actions/types'
import { v4 as uuidv4 } from 'uuid'
import { getModel } from '../config/model-config'
import { getSafeMessageHistory } from '../utils/message-utils'
import { loadPromptCached } from '../prompts/hub-loader'

// Model is created inside the function to use request-scoped config (AsyncLocalStorage)

import { CONSEQUENCE_TRACKER_PROMPT } from '../prompts/agents/consequence-tracker'

export const consequenceTrackerAgent = async (state: WritersRoomState) => {
  // Create model inside function to use request-scoped config
  const model = getModel('consequenceTracker')

  const { messages: stateMessages, unresolvedSetups } = state

  // Load prompt from Hub
  const loadedPrompt = await loadPromptCached('consequenceTracker')
  const promptMessages =
    (loadedPrompt.prompt as any).promptMessages || (loadedPrompt.prompt as any).messages || []
  const systemMessageFromPrompt = promptMessages.find(
    (m: any) => m.lc_id?.[3] === 'SystemMessagePromptTemplate' || m._type === 'system'
  )
  const systemTemplate =
    systemMessageFromPrompt?.prompt?.template ||
    systemMessageFromPrompt?.template ||
    CONSEQUENCE_TRACKER_PROMPT

  const systemMessage = new SystemMessage(
    systemTemplate.replace('{unresolvedSetups}', JSON.stringify(unresolvedSetups || [], null, 2))
  )

  try {
    const response = await model.invoke([systemMessage, ...stateMessages.slice(-5)])
    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

    // Try to parse JSON for actions
    let parsed: any = null
    let actions: AgentAction[] = []

    try {
      let jsonStr = content
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) jsonStr = jsonMatch[1].trim()
      parsed = JSON.parse(jsonStr)
      actions = parsed?.actions || []
    } catch (e) {
      // Parse from text
      const newSetupMatch = content.match(/New Setup Added:\s*(.+?)(?:\n|$)/i)
      if (newSetupMatch && state.currentBeat) {
        actions.push({
          type: 'ADD_SETUP',
          payload: { description: newSetupMatch[1].trim(), beatId: state.currentBeat.id },
        })
      }
    }

    const namedMessage = new AIMessage({
      content: parsed?.message || content,
      name: 'ConsequenceTracker',
    })

    ;(namedMessage as any).actions = actions

    return {
      messages: [namedMessage],
    }
  } catch (error) {
    console.error('Consequence Tracker error:', error)
    return {
      messages: [new AIMessage({ content: 'Tracking consequences.', name: 'ConsequenceTracker' })],
    }
  }
}
