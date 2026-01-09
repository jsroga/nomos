import { WritersRoomState, CharacterState } from '../graph/state'
import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { assembleContext } from '../context/assembler'
import { AgentAction } from '../actions/types'
import { getModel } from '../config/model-config'
import { isSafeAction } from '../actions/executor'
import { getSafeMessageHistory } from '../utils/message-utils'
import { loadPromptCached } from '../prompts/hub-loader'

// Model is created inside the function to use request-scoped config (AsyncLocalStorage)

import { CHARACTER_PSYCHOLOGY_PROMPT } from '../prompts/agents/character-psychology'

export const characterPsychologyAgent = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  // Create model inside function to use request-scoped config
  const model = getModel('characterPsychology')

  console.log('Character Psychology validating...')

  const context = assembleContext(state, 'characterPsychology')

  // Load prompt from Hub
  const loadedPrompt = await loadPromptCached('characterPsychology')
  const promptMessages = (loadedPrompt.prompt as any).promptMessages || (loadedPrompt.prompt as any).messages || []
  const systemMessage = promptMessages.find((m: any) => m.lc_id?.[3] === 'SystemMessagePromptTemplate' || m._type === 'system')
  const systemTemplate = systemMessage?.prompt?.template || systemMessage?.template || CHARACTER_PSYCHOLOGY_PROMPT

  // Combine system content into single message (required for Claude)
  const combinedSystem = [context.systemPrompt, context.stateContext, systemTemplate].join('\n\n---\n\n')
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
      // Fall back to text parsing
    }

    // Extract data
    const messageContent = parsed?.message || content
    const actions: AgentAction[] = parsed?.actions || []
    const decision = parsed?.decision

    let lastAction: string | undefined
    if (decision === 'APPROVED' || content.includes('APPROVED')) {
      lastAction = 'APPROVED'
    } else if (decision === 'REJECTED' || content.includes('REJECTED')) {
      lastAction = 'REJECTED'
    }

    const namedMessage = new AIMessage({
      content: messageContent,
      name: 'CharacterPsychology',
    })

      // Attach actions for UI
      ; (namedMessage as any).actions = actions
      ; (namedMessage as any).decision = decision || lastAction

    // Apply safe actions directly to state
    let updatedCharacters = [...state.characters]

    for (const action of actions) {
      if (isSafeAction(action)) {
        console.log(`CharacterPsychology executing safe action: ${action.type}`)

        switch (action.type) {
          case 'UPDATE_CHARACTER_METRICS': {
            const { characterId, changes, reason } = action.payload
            updatedCharacters = updatedCharacters.map(char => {
              if (char.characterId === characterId || char.name === characterId) {
                // Apply deltas to each metric, clamping to valid ranges
                const updatedMetrics = { ...char.metrics }

                if (changes.valence !== undefined) {
                  updatedMetrics.valence = Math.max(
                    -100,
                    Math.min(100, (char.metrics?.valence || 0) + changes.valence)
                  )
                }
                if (changes.arousal !== undefined) {
                  updatedMetrics.arousal = Math.max(
                    0,
                    Math.min(100, (char.metrics?.arousal || 50) + changes.arousal)
                  )
                }
                if (changes.autonomy !== undefined) {
                  updatedMetrics.autonomy = Math.max(
                    0,
                    Math.min(100, (char.metrics?.autonomy || 60) + changes.autonomy)
                  )
                }
                if (changes.competence !== undefined) {
                  updatedMetrics.competence = Math.max(
                    0,
                    Math.min(100, (char.metrics?.competence || 60) + changes.competence)
                  )
                }
                if (changes.relatedness !== undefined) {
                  updatedMetrics.relatedness = Math.max(
                    0,
                    Math.min(100, (char.metrics?.relatedness || 50) + changes.relatedness)
                  )
                }
                if (changes.cognitiveClarity !== undefined) {
                  updatedMetrics.cognitiveClarity = Math.max(
                    0,
                    Math.min(100, (char.metrics?.cognitiveClarity || 70) + changes.cognitiveClarity)
                  )
                }
                if (changes.perceivedStakes !== undefined) {
                  updatedMetrics.perceivedStakes = Math.max(
                    0,
                    Math.min(100, (char.metrics?.perceivedStakes || 40) + changes.perceivedStakes)
                  )
                }
                if (changes.socialSafety !== undefined) {
                  updatedMetrics.socialSafety = Math.max(
                    0,
                    Math.min(100, (char.metrics?.socialSafety || 60) + changes.socialSafety)
                  )
                }
                if (changes.moralAlignment !== undefined) {
                  updatedMetrics.moralAlignment = Math.max(
                    0,
                    Math.min(100, (char.metrics?.moralAlignment || 70) + changes.moralAlignment)
                  )
                }

                return {
                  ...char,
                  metrics: updatedMetrics,
                  metricsHistory: [
                    ...(char.metricsHistory || []),
                    {
                      beatId: state.currentBeat?.id || 'unknown',
                      beatSequence: state.beatBoard.length,
                      changes,
                      reason: reason || 'Character psychology analysis',
                      timestamp: Date.now(),
                    },
                  ],
                }
              }
              return char
            })
            break
          }
          case 'ADD_KNOWLEDGE': {
            const { characterId, knowledge } = action.payload
            updatedCharacters = updatedCharacters.map(char => {
              if (char.characterId === characterId || char.name === characterId) {
                return {
                  ...char,
                  knowledgeState: [...(char.knowledgeState || []), knowledge],
                }
              }
              return char
            })
            break
          }
        }
      }
    }

    return {
      messages: [namedMessage],
      lastAction,
      characters:
        updatedCharacters.length !== state.characters.length ||
          JSON.stringify(updatedCharacters) !== JSON.stringify(state.characters)
          ? updatedCharacters
          : undefined,
    }
  } catch (error) {
    console.error('Character Psychology error:', error)
    const errorMessage = new AIMessage({
      content: 'I need character profiles to evaluate motivation.',
      name: 'CharacterPsychology',
    })
    return {
      messages: [errorMessage],
      shouldTerminate: true,
    }
  }
}
