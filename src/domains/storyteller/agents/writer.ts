import { WritersRoomState } from '../graph/state'
import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { assembleContext } from '../context/assembler'
import { AgentAction } from '../actions/types'
import { getModel } from '../config/model-config'
import { getSafeMessageHistory } from '../utils/message-utils'
import { scriptEditTools } from '../tools/script-tools'

// Model is created inside the function to use request-scoped config (AsyncLocalStorage)

const WRITER_STRUCTURED_PROMPT = `
## YOUR ROLE
You are the WRITER. You transform approved beats into screenplay prose.

## AVAILABLE TOOLS
You have access to script editing tools that you can call to refine your work:
- **expand_scene**: Add visual detail, sensory descriptions, beat-by-beat action
- **condense_scene**: Tighten pacing, remove redundancy
- **improve_dialogue**: Make dialogue more natural, add subtext
- **add_visual_hook**: Add a compelling opening image
- **shift_tone**: Adjust the emotional quality
- **regenerate_text**: Custom edits with specific instructions

## WHEN TO USE TOOLS
- If you receive REVISION feedback from the Script Editor, use tools to address specific issues
- Use expand_scene when feedback mentions "sparse" or "needs detail"
- Use improve_dialogue when feedback mentions "dialogue" or "character voice"
- Use condense_scene when feedback mentions "pacing" or "too long"

## RESPONSE FORMAT
When writing new content, respond with JSON:
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

When revising based on feedback, you may call the editing tools directly.

## SCREENPLAY FORMAT
- Scene headings: INT./EXT. LOCATION - DAY/NIGHT
- Action lines: Present tense, visual, concise
- Character names: CAPS when introduced, before dialogue
- Dialogue: Character name centered, dialogue below
- Parentheticals: (beat), (angry), etc. - use sparingly

## CRITICAL
You MUST commit an UPDATE_SCRIPT action with actual screenplay content.
Don't just describe - WRITE the scene!

When revising, address the feedback specifically.

Respond ONLY with valid JSON (unless calling a tool).
`

export const writerAgent = async (state: WritersRoomState): Promise<Partial<WritersRoomState>> => {
  // Create model inside function to use request-scoped config
  const baseModel = getModel('writer')
  
  console.log('Writer crafting screenplay...')

  // Only write in cardlock or writing phase
  if (state.currentPhase !== 'cardlock' && state.currentPhase !== 'writing') {
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

  const context = assembleContext(state, 'writer')

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
  const combinedSystem = [
    context.systemPrompt,
    context.stateContext,
    WRITER_STRUCTURED_PROMPT,
    revisionContext,
  ].join('\n\n---\n\n')
  const conversationMessages = getSafeMessageHistory(state.messages, 5).filter(m => m._getType() !== 'system')
  
  const messages = [
    new SystemMessage(combinedSystem),
    ...conversationMessages,
  ]

  try {
    const response = await model.invoke(messages)

    // Check if the Writer made tool calls (for editing operations)
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log('Writer made tool calls:', response.tool_calls.map(tc => tc.name))
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
