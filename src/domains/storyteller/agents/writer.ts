import { WritersRoomState } from '../graph/state'
import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { buildAgentContext } from '../utils/context-builder'
import { AgentAction } from '../actions/types'
import { getModel } from '../config/model-config'
import { getSafeMessageHistory } from '../utils/message-utils'
import { scriptEditTools } from '../tools/script-tools'
import { loadPromptCached } from '../prompts/hub-loader'

// Model is created inside the function to use request-scoped config (AsyncLocalStorage)

import { WRITER_STRUCTURED_PROMPT } from '../prompts/agents/writer'

export const writerAgent = async (state: WritersRoomState): Promise<Partial<WritersRoomState>> => {
  // Create model inside function to use request-scoped config
  const baseModel = getModel('writer')

  console.log('Writer crafting screenplay...')

  // Only write in cardlock or writing phase
  // Accept 'writing', 'cardlock', or 'drafting' phases for script generation
  if (
    state.currentPhase !== 'cardlock' &&
    state.currentPhase !== 'writing' &&
    state.currentPhase !== 'drafting'
  ) {
    const skipMessage = new AIMessage({
      content: 'Waiting for beat board to be locked before writing.',
      name: 'Writer',
    })
    return { messages: [skipMessage] }
  }

  // Check if we're revising based on feedback
  const isRevising = state.lastScriptVerdict === 'REVISE' && state.scriptFeedback?.length > 0

  // Bind editing tools when revising (allows Writer to use tools for targeted edits)
  const model = isRevising ? baseModel.bindTools(scriptEditTools) : baseModel

  const contextXml = buildAgentContext(state, 'writing')

  // Add revision context if available
  const revisionContext = isRevising
    ? `
## REVISION REQUIRED
Previous script was marked for revision. Address the following feedback:
${state.scriptFeedback?.map((f, i) => `${i + 1}. ${f}`).join('\n')}

You may use the editing tools (expand_scene, improve_dialogue, etc.) to address specific issues,
or rewrite the content directly.
`
    : ''

  // Combine system content into single message (required for Claude)
  const loadedPrompt = await loadPromptCached('writer')
  const promptMessages =
    (loadedPrompt.prompt as any).promptMessages || (loadedPrompt.prompt as any).messages || []
  const systemMessage = promptMessages.find(
    (m: any) => m.lc_id?.[3] === 'SystemMessagePromptTemplate' || m._type === 'system'
  )
  const systemTemplate =
    systemMessage?.prompt?.template || systemMessage?.template || WRITER_STRUCTURED_PROMPT

  const combinedSystem = [systemTemplate, contextXml, revisionContext].join('\n\n---\n\n')
  const conversationMessages = getSafeMessageHistory(state.messages, 5).filter(
    m => m._getType() !== 'system'
  )

  const messages = [new SystemMessage(combinedSystem), ...conversationMessages]

  try {
    const response = await model.invoke(messages)

    // Check if the Writer made tool calls (for editing operations)
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log(
        'Writer made tool calls:',
        response.tool_calls.map(tc => tc.name)
      )
      // Return the response with tool calls - the graph will route to writer_tools node
      return {
        messages: [response],
      }
    }

    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

    // Try to parse JSON response
    let parsed: any = null
    try {
      let jsonStr = content
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim()
      }
      parsed = JSON.parse(jsonStr)
    } catch (e) {
      // If parsing fails, treat the whole response as script content
      parsed = {
        message: 'Writing scene...',
        actions: [
          {
            type: 'UPDATE_SCRIPT',
            payload: { content },
          },
        ],
        scriptSection: content,
      }
    }

    const messageContent = parsed?.message || 'Scene written.'
    const actions: AgentAction[] = parsed?.actions || []
    const scriptSection = parsed?.scriptSection || ''

    // Ensure we have an UPDATE_SCRIPT action
    if (actions.length === 0 && scriptSection) {
      actions.push({
        type: 'UPDATE_SCRIPT',
        payload: { content: scriptSection },
      })
    }

    const namedMessage = new AIMessage({
      content: messageContent,
      name: 'Writer',
    })

    // Attach actions and script
    ;(namedMessage as any).actions = actions

    // Update script in state
    const newScript = state.script ? state.script + '\n\n' + scriptSection : scriptSection

    return {
      messages: [namedMessage],
      script: newScript,
      scriptVersion: (state.scriptVersion || 0) + 1,
    }
  } catch (error) {
    console.error('Writer error:', error)
    const errorMessage = new AIMessage({
      content: 'Unable to write scene. Please ensure beats are locked.',
      name: 'Writer',
    })
    return {
      messages: [errorMessage],
    }
  }
}
