import { WritersRoomState } from '../graph/state'
import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { assembleContext } from '../context/assembler'
import { AgentAction } from '../actions/types'
import { getModel } from '../config/model-config'
import { getSafeMessageHistory } from '../utils/message-utils'

// Model is created inside the function to use request-scoped config (AsyncLocalStorage)

const WRITER_STRUCTURED_PROMPT = `
## YOUR ROLE
You are the WRITER. You transform approved beats into screenplay prose.

## RESPONSE FORMAT
Respond with JSON:
{
    "message": "Brief note about what you wrote",
    "actions": [
        {
            "type": "UPDATE_SCRIPT",
            "payload": {
                "content": "FULL SCREENPLAY TEXT HERE - proper format with scene headings, action lines, dialogue"
            }
        }
    ],
    "scriptSection": "The actual screenplay content to add"
}

## SCREENPLAY FORMAT
- Scene headings: INT./EXT. LOCATION - DAY/NIGHT
- Action lines: Present tense, visual, concise
- Character names: CAPS when introduced, before dialogue
- Dialogue: Character name centered, dialogue below
- Parentheticals: (beat), (angry), etc. - use sparingly

## CRITICAL
You MUST commit an UPDATE_SCRIPT action with actual screenplay content.
Don't just describe - WRITE the scene!

Respond ONLY with valid JSON.
`

export const writerAgent = async (state: WritersRoomState): Promise<Partial<WritersRoomState>> => {
  // Create model inside function to use request-scoped config
  const model = getModel('writer')
  
  console.log('Writer crafting screenplay...')

  // Only write in cardlock or writing phase
  if (state.currentPhase !== 'cardlock' && state.currentPhase !== 'writing') {
    const skipMessage = new AIMessage({
      content: 'Waiting for beat board to be locked before writing.',
      name: 'Writer',
    })
    return { messages: [skipMessage] }
  }

  const context = assembleContext(state, 'writer')

  // Combine system content into single message (required for Claude)
  const combinedSystem = [context.systemPrompt, context.stateContext, WRITER_STRUCTURED_PROMPT].join('\n\n---\n\n')
  const conversationMessages = getSafeMessageHistory(state.messages, 5).filter(m => m._getType() !== 'system')
  
  const messages = [
    new SystemMessage(combinedSystem),
    ...conversationMessages,
  ]

  try {
    const response = await model.invoke(messages)
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
