import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { WritersRoomState } from '../graph/state'
import { getModel } from '../config/model-config'
import { getSafeMessageHistory, extractReadableMessage } from '../utils/message-utils'
import { loadPromptCached } from '../prompts/hub-loader'

import { VISUAL_MOMENT_PROMPT } from '../prompts/agents/visual-moment'

export const visualMomentAgent = async (state: WritersRoomState) => {
  // Create model inside function to use request-scoped config
  const model = getModel('visualMoment')

  const { messages: stateMessages } = state

  // Load prompt from Hub
  const loadedPrompt = await loadPromptCached('visualMoment')
  const promptMessages =
    (loadedPrompt.prompt as any).promptMessages || (loadedPrompt.prompt as any).messages || []
  const systemMessageFromPrompt = promptMessages.find(
    (m: any) => m.lc_id?.[3] === 'SystemMessagePromptTemplate' || m._type === 'system'
  )
  const systemTemplate =
    systemMessageFromPrompt?.prompt?.template ||
    systemMessageFromPrompt?.template ||
    VISUAL_MOMENT_PROMPT

  const systemMessage = new SystemMessage(systemTemplate)

  try {
    const response = await model.invoke([systemMessage, ...getSafeMessageHistory(stateMessages, 5)])
    const rawContent =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
    const content = extractReadableMessage(rawContent)

    const namedMessage = new AIMessage({
      content,
      name: 'VisualMoment',
    })

    return {
      messages: [namedMessage],
    }
  } catch (error) {
    console.error('Visual Moment error:', error)
    return {
      messages: [new AIMessage({ content: 'Visual hook needed.', name: 'VisualMoment' })],
    }
  }
}
