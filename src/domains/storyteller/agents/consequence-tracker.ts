import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { WritersRoomState } from '../graph/state'
import { AgentAction } from '../actions/types'
import { v4 as uuidv4 } from 'uuid'
import { getModel } from '../config/model-config'
import { getSafeMessageHistory } from '../utils/message-utils'

// Model is created inside the function to use request-scoped config (AsyncLocalStorage)

const CONSEQUENCE_PROMPT = `You are the CONSEQUENCE TRACKER - the memory of the story.

## YOUR MISSION: MAINTAIN CAUSALITY

"Nothing is free. Every action has consequences. Every setup needs payoff."

## TRACK THESE

1. **SETUPS AWAITING PAYOFF (Chekhov's Guns)**
   - If a gun appears in Act 1, it MUST fire in Act 3
   - Every introduced element needs resolution

2. **WHO KNOWS WHAT (Dramatic Irony)**
   - Track each character's knowledge state
   - Dramatic irony = audience knows more than character

3. **DANGLING THREADS**
   - Setups without payoffs after too many beats = warning
   - Plot threads that were forgotten

## OUTPUT FORMAT
{
    "message": "Analysis of setups, payoffs, and knowledge states",
    "actions": [
        { "type": "ADD_SETUP", "payload": { "description": "What was set up", "beatId": "current-beat-id" } },
        { "type": "RESOLVE_SETUP", "payload": { "setupId": "setup-id", "payoffBeatId": "current-beat-id" } },
        { "type": "ADD_KNOWLEDGE", "payload": { "characterId": "char-id", "knowledge": "What they learned" } }
    ],
    "danglingWarnings": ["Setups that are taking too long to resolve"],
    "newSetups": ["New setups from this beat"],
    "resolvedSetups": ["Setups paid off by this beat"]
}

CURRENT UNRESOLVED SETUPS:
{unresolvedSetups}

Respond with JSON only.`

export const consequenceTrackerAgent = async (state: WritersRoomState) => {
  // Create model inside function to use request-scoped config
  const model = getModel('consequenceTracker')
  
  const { messages, unresolvedSetups } = state

  const systemMessage = new SystemMessage(
    CONSEQUENCE_PROMPT.replace(
      '{unresolvedSetups}',
      JSON.stringify(unresolvedSetups || [], null, 2)
    )
  )

  try {
    const response = await model.invoke([systemMessage, ...messages.slice(-5)])
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
