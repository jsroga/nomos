import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { WritersRoomState } from '../graph/state'
import { getModel } from '../config/model-config'
import { getSafeMessageHistory, extractReadableMessage } from '../utils/message-utils'
import { loadPromptCached } from '../prompts/hub-loader'

import { MAGIC_AGENT_PROMPT } from '../prompts/agents/magic-agent'

export const magicAgent = async (state: WritersRoomState): Promise<Partial<WritersRoomState>> => {
  // Create model inside function to use request-scoped config
  const model = getModel('magicAgent')

  const { messages: stateMessages } = state

  // Load prompt from Hub
  const loadedPrompt = await loadPromptCached('magicAgent')
  const promptMessages = (loadedPrompt.prompt as any).promptMessages || (loadedPrompt.prompt as any).messages || []
  const systemMessageFromPrompt = promptMessages.find((m: any) => m.lc_id?.[3] === 'SystemMessagePromptTemplate' || m._type === 'system')
  const systemTemplate = systemMessageFromPrompt?.prompt?.template || systemMessageFromPrompt?.template || MAGIC_AGENT_PROMPT

  const systemMessage = new SystemMessage(systemTemplate)

  try {
    const response = await model.invoke([systemMessage, ...getSafeMessageHistory(stateMessages, 5)])
    const rawContent =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
    const content = extractReadableMessage(rawContent)

    const namedMessage = new AIMessage({
      content,
      name: 'MagicAgent',
    })

    return {
      messages: [namedMessage],
    }
  } catch (error) {
    console.error('Magic Agent error:', error)
    return {
      messages: [
        new AIMessage({
          content: '🍌 *throws a banana into the scene and disappears*',
          name: 'MagicAgent',
        }),
      ],
    }
  }
}
