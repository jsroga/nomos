import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { WritersRoomState } from '../graph/state'
import { getModel } from '../config/model-config'
import { getSafeMessageHistory, extractReadableMessage } from '../utils/message-utils'
import { loadPromptCached } from '../prompts/hub-loader'

// Model is created inside the function to use request-scoped config (AsyncLocalStorage)

import { DEVILS_ADVOCATE_PROMPT } from '../prompts/agents/devils-advocate'

export const devilsAdvocateAgent = async (state: WritersRoomState) => {
  // Create model inside function to use request-scoped config
  const model = getModel('devilsAdvocate')

  const { messages: stateMessages } = state

  // Load prompt from Hub
  const loadedPrompt = await loadPromptCached('devilsAdvocate')
  const promptMessages =
    (loadedPrompt.prompt as any).promptMessages || (loadedPrompt.prompt as any).messages || []
  const systemPromptMessage = promptMessages.find(
    (m: any) => m.lc_id?.[3] === 'SystemMessagePromptTemplate' || m._type === 'system'
  )
  const systemTemplate =
    systemPromptMessage?.prompt?.template || systemPromptMessage?.template || DEVILS_ADVOCATE_PROMPT

  const systemMessage = new SystemMessage(systemTemplate)

  try {
    const response = await model.invoke([systemMessage, ...getSafeMessageHistory(stateMessages, 5)])
    const rawContent =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
    const content = extractReadableMessage(rawContent)

    const namedMessage = new AIMessage({
      content,
      name: 'DevilsAdvocate',
    })

    return {
      messages: [namedMessage],
    }
  } catch (error) {
    console.error("Devil's Advocate error:", error)
    return {
      messages: [new AIMessage({ content: 'No objections. PASS.', name: 'DevilsAdvocate' })],
    }
  }
}
