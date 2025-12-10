import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { WritersRoomState } from '../graph/state'
import { getModel } from '../config/model-config'
import { getSafeMessageHistory, extractReadableMessage } from '../utils/message-utils'

const VISUAL_PROMPT = `You are the VISUAL MOMENT SPECIALIST - the cinematographer of the writers room.

## YOUR MISSION: MAKE IT CINEMATIC

"What's the first thing we see? Make it iconic, meaningful, memorable."

## THINK LIKE A DIRECTOR

Every great scene has a VISUAL HOOK - an image that:
- Burns into the viewer's memory
- Conveys subtext without dialogue
- Uses the frame as a storytelling tool

## WHAT TO SPECIFY

1. **FRAMING**: Wide/close/extreme close-up? What's in focus?
2. **LIGHTING**: Natural/artificial? Shadows? Color temperature?
3. **MOVEMENT**: Static? Tracking? Handheld?
4. **COMPOSITION**: Rule of thirds? Symmetry? Leading lines?
5. **SYMBOLIC ELEMENT**: What object/detail carries meaning?

## OUTPUT FORMAT
{
    "message": "Description of the visual moment",
    "visualHook": "The specific image we see",
    "framing": "How it's shot",
    "symbolism": "What it means",
    "reference": "Similar iconic shot from cinema history"
}

Respond with JSON only.`

export const visualMomentAgent = async (state: WritersRoomState) => {
  // Create model inside function to use request-scoped config
  const model = getModel('visualMoment')
  
  const { messages } = state

  const systemMessage = new SystemMessage(VISUAL_PROMPT)

  try {
    const response = await model.invoke([systemMessage, ...getSafeMessageHistory(messages, 5)])
    const rawContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
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
