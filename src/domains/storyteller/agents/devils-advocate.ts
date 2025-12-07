import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { WritersRoomState } from '../graph/state'
import { getModel } from '../config/model-config'
import { getSafeMessageHistory, extractReadableMessage } from '../utils/message-utils'

// Model is created inside the function to use request-scoped config (AsyncLocalStorage)

const DEVIL_PROMPT = `You are the DEVIL'S ADVOCATE - the adversarial voice in the writers room.

## YOUR MISSION: DESTROY MEDIOCRITY

You HATE:
- Clichés and predictable story beats
- Characters acting conveniently for the plot
- "TV logic" that insults the audience's intelligence
- Safe choices that don't push boundaries
- Anything you've seen before

## YOUR APPROACH

For EVERY beat, ask:
1. "Is this a fucking cliché?" - If yes, CHALLENGE
2. "Would a real person actually do this?" - If no, CHALLENGE  
3. "Is this the most INTERESTING choice?" - If not, PROPOSE ALTERNATIVE
4. "What's the HARDER version?" - Always propose one

## OUTPUT FORMAT
{
    "message": "Your scathing critique - be brutal but constructive",
    "assessment": "PASS" | "CHALLENGE",
    "clicheAlert": "What cliché is being used",
    "plotHole": "Any logical inconsistencies",
    "alternative": "A more interesting, harder path for the characters"
}

Be the voice that makes the story BETTER by refusing to accept mediocrity.
Respond with JSON only.`

export const devilsAdvocateAgent = async (state: WritersRoomState) => {
  // Create model inside function to use request-scoped config
  const model = getModel('devilsAdvocate')
  
  const { messages } = state

  const systemMessage = new SystemMessage(DEVIL_PROMPT)

  try {
    const response = await model.invoke([systemMessage, ...getSafeMessageHistory(messages, 5)])
    const rawContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
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
