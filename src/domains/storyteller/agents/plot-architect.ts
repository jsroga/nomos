import { WritersRoomState, BeatCard } from '../graph/state'
import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { assembleContext } from '../context/assembler'
import { AgentAction } from '../actions/types'
import { v4 as uuidv4 } from 'uuid'
import { getModel } from '../config/model-config'
import { parseAgentResponse, BeatProposalSchema } from '../schemas/agent-schemas'
import { z } from 'zod'

import { getSafeMessageHistory } from '../utils/message-utils'
import { loadPromptCached } from '../prompts/hub-loader'

// Simplified schema for Plot Architect - avoids complex discriminated union
const SimplePlotArchitectResponseSchema = z.object({
  message: z.string().describe('Your response to the user'),
  thinking: z.string().nullable().optional().describe('Your reasoning'),
  confidence: z.number().min(0).max(1).nullable().optional(),
  beat: BeatProposalSchema.nullable().optional().describe('The proposed beat'),
})

type SimplePlotArchitectResponse = z.infer<typeof SimplePlotArchitectResponseSchema>

// Model is created inside the function to use request-scoped config (AsyncLocalStorage)

import { PLOT_ARCHITECT_STRUCTURED_PROMPT } from '../prompts/agents/plot-architect'

// Parse beat from LLM response
function parseBeatFromResponse(content: string, episodeId?: string): BeatCard | null {
  try {
    // Extract key elements using regex
    const loglineMatch = content.match(/Logline:\s*(.+?)(?:\n|$)/i)
    const typeMatch = content.match(/Type:\s*(\w+)/i)
    const charactersMatch = content.match(/Characters?:\s*(.+?)(?:\n|$)/i)
    const visualMatch = content.match(/Visual Hook:\s*(.+?)(?:\n|$)/i)

    if (!loglineMatch) return null

    const beatType = (typeMatch?.[1]?.toLowerCase() || 'complication') as BeatCard['beatType']
    const validTypes = ['setup', 'complication', 'revelation', 'decision', 'consequence']

    return {
      id: uuidv4(),
      episodeId: episodeId || 'default',
      sequence: 0, // Will be set when added to board
      logline: loglineMatch[1].trim(),
      beatType: validTypes.includes(beatType) ? beatType : 'complication',
      charactersInvolved: charactersMatch?.[1]?.split(',').map(s => s.trim()) || [],
      emotionalShifts: {},
      visualHook: visualMatch?.[1]?.trim() || '',
      causalDependencies: [],
      setupsPayoffs: {},
      status: 'proposed',
      mazurElements: parseMazurElements(content),
    }
  } catch (e) {
    console.error('Failed to parse beat:', e)
    return null
  }
}

function parseMazurElements(content: string): BeatCard['mazurElements'] {
  const elements: BeatCard['mazurElements'] = {}

  const mappings = [
    ['character', /Character:\s*(.+?)(?:\n|$)/i],
    ['object', /Object:\s*(.+?)(?:\n|$)/i],
    ['coreConcept', /Core Concept:\s*(.+?)(?:\n|$)/i],
    ['attribute', /Attribute:\s*(.+?)(?:\n|$)/i],
    ['action', /Action:\s*(.+?)(?:\n|$)/i],
    ['method', /Method:\s*(.+?)(?:\n|$)/i],
    ['setting', /Setting:\s*(.+?)(?:\n|$)/i],
    ['timeframe', /Timeframe:\s*(.+?)(?:\n|$)/i],
    ['motivation', /Motivation:\s*(.+?)(?:\n|$)/i],
    ['tone', /Tone:\s*(.+?)(?:\n|$)/i],
  ] as const

  for (const [key, regex] of mappings) {
    const match = content.match(regex)
    if (match) {
      elements[key] = match[1].trim()
    }
  }

  return elements
}

export const plotArchitectAgent = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  // Create model inside function to use request-scoped config
  const model = getModel('plotArchitect')

  console.log('Plot Architect proposing...')

  const context = assembleContext(state, 'plotArchitect')

  // Load prompt from Hub
  const loadedPrompt = await loadPromptCached('plotArchitect')
  const promptMessages =
    (loadedPrompt.prompt as any).promptMessages || (loadedPrompt.prompt as any).messages || []
  const systemMessage = promptMessages.find(
    (m: any) => m.lc_id?.[3] === 'SystemMessagePromptTemplate' || m._type === 'system'
  )
  const systemTemplate =
    systemMessage?.prompt?.template || systemMessage?.template || PLOT_ARCHITECT_STRUCTURED_PROMPT

  // Combine system content into single message (required for Claude)
  const combinedSystem = [context.systemPrompt, context.stateContext, systemTemplate].join(
    '\n\n---\n\n'
  )
  const rawConversationMessages = getSafeMessageHistory(state.messages, 6).filter(
    m => m._getType() !== 'system'
  )

  // CRITICAL: Clean dangling tool_calls from message history (same issue as supervisor)
  const cleanedMessages = rawConversationMessages
    .map(m => {
      if (m._getType() === 'ai' && (m as any).tool_calls?.length > 0) {
        // Remove all tool_calls - Plot Architect doesn't need them
        const newMsg = new AIMessage({
          content: m.content || 'Processing...',
          name: (m as any).name,
        })
        if (newMsg.additional_kwargs) {
          delete (newMsg.additional_kwargs as any).tool_calls
        }
        return newMsg
      }
      // Also filter out ToolMessages entirely - Plot Architect doesn't use tools
      if (m._getType() === 'tool') {
        return null
      }
      return m
    })
    .filter(Boolean) as typeof rawConversationMessages

  const messages = [new SystemMessage(combinedSystem), ...cleanedMessages]

  try {
    // Try structured output first with SIMPLIFIED schema
    let parsed: SimplePlotArchitectResponse | null = null
    let proposedBeat: BeatCard | null = null
    const actions: AgentAction[] = []

    try {
      const structuredModel = model.withStructuredOutput(SimplePlotArchitectResponseSchema)
      parsed = (await structuredModel.invoke(messages)) as SimplePlotArchitectResponse
      console.log('Plot Architect: Structured output succeeded')
    } catch (structuredError) {
      const errorMsg =
        structuredError instanceof Error ? structuredError.message : String(structuredError)
      console.warn('Plot Architect: Structured output failed:', errorMsg.slice(0, 200))

      // Fallback to manual parsing without structured output
      try {
        const response = await model.invoke(messages)
        const content =
          typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

        console.log('Plot Architect: Fallback response received, length:', content.length)

        // Try to parse as JSON first
        parsed = parseAgentResponse(content, SimplePlotArchitectResponseSchema)

        if (!parsed) {
          console.log('Plot Architect: JSON parsing failed, trying regex extraction')

          // Last resort: try regex parsing for beat
          proposedBeat = parseBeatFromResponse(content, state.episodeId)

          // Try to extract message from raw JSON
          let extractedMessage = 'I have prepared a beat proposal for your story.'

          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              const rawParsed = JSON.parse(jsonMatch[0])
              if (rawParsed.message && typeof rawParsed.message === 'string') {
                extractedMessage = rawParsed.message
              }
              // Try to extract beat from response
              if (rawParsed.beat) {
                parsed = {
                  message: extractedMessage,
                  beat: rawParsed.beat,
                  confidence: 0.5,
                  thinking: null,
                }
              }
            }
          } catch (jsonError) {
            console.log('Plot Architect: Raw JSON extraction failed, using regex beat')
          }

          if (!parsed) {
            parsed = {
              message: extractedMessage,
              beat: null,
              confidence: 0.5,
              thinking: null,
            }
          }
        }
      } catch (fallbackError) {
        console.error('Plot Architect: Fallback parsing also failed:', fallbackError)
        parsed = {
          message:
            'I encountered an issue while preparing the beat. Let me try a different approach.',
          beat: null,
          confidence: 0.3,
          thinking: null,
        }
      }
    }

    // Convert beat from simplified schema to action
    if (parsed?.beat) {
      const beat = parsed.beat
      actions.push({
        type: 'CREATE_BEAT',
        payload: {
          logline: beat.logline,
          beatType: beat.beatType || 'complication',
          content: beat.content || '',
          visualHook: beat.visualHook || '',
          charactersInvolved: beat.charactersInvolved || [],
          emotionalShifts: beat.emotionalShifts || null,
          mazurElements: beat.mazurElements || null,
        },
      })

      // Create BeatCard for UI
      proposedBeat = {
        id: uuidv4(),
        episodeId: state.episodeId || 'default',
        sequence: state.beatBoard.length + 1,
        logline: beat.logline,
        beatType: beat.beatType || 'complication',
        charactersInvolved: beat.charactersInvolved || [],
        emotionalShifts: {},
        visualHook: beat.visualHook || '',
        causalDependencies: [],
        setupsPayoffs: {},
        status: 'proposed',
        mazurElements: beat.mazurElements || undefined,
      }
    }

    // Fallback: If no beat from schema but we parsed one from regex
    if (actions.length === 0 && proposedBeat) {
      actions.push({
        type: 'CREATE_BEAT',
        payload: {
          logline: proposedBeat.logline,
          beatType: proposedBeat.beatType,
          content: proposedBeat.mazurElements ? JSON.stringify(proposedBeat.mazurElements) : '',
          visualHook: proposedBeat.visualHook,
          charactersInvolved: proposedBeat.charactersInvolved,
          emotionalShifts: proposedBeat.emotionalShifts,
        },
      })
    }

    // Apply Character Metric Updates if present in actions
    // This allows the beat to immediately affect character state
    let updatedCharacters = [...state.characters]
    for (const action of actions) {
      if (action.type === 'UPDATE_CHARACTER_METRICS') {
        const { characterId, changes, reason } = action.payload as any
        updatedCharacters = updatedCharacters.map(char => {
          if (char.characterId === characterId || char.name === characterId) {
            const updatedMetrics = { ...char.metrics }
            // Apply numeric changes
            if (changes.valence !== undefined)
              updatedMetrics.valence = Math.min(
                100,
                Math.max(-100, (updatedMetrics.valence || 0) + changes.valence)
              )
            if (changes.arousal !== undefined)
              updatedMetrics.arousal = Math.min(
                100,
                Math.max(0, (updatedMetrics.arousal || 50) + changes.arousal)
              )
            if (changes.autonomy !== undefined)
              updatedMetrics.autonomy = Math.min(
                100,
                Math.max(0, (updatedMetrics.autonomy || 60) + changes.autonomy)
              )
            // ... (add other metrics as needed, keeping it concise for now)

            return {
              ...char,
              metrics: updatedMetrics,
              metricsHistory: [
                ...(char.metricsHistory || []),
                {
                  beatId: proposedBeat?.id || 'unknown',
                  beatSequence: state.beatBoard.length + 1,
                  changes,
                  reason: reason || 'Beat impact',
                  timestamp: Date.now(),
                },
              ],
            }
          }
          return char
        })
      }
    }

    const messageContent = parsed?.message || 'Beat proposal generated'
    const confidence = parsed?.confidence ?? 0.7

    const namedMessage = new AIMessage({
      content: `🎬 **NEW BEAT PROPOSED** (#${state.beatBoard.length + 1})\n\n${messageContent}${proposedBeat ? `\n\n**Logline:** ${proposedBeat.logline}\n**Type:** ${proposedBeat.beatType}\n**Visual Hook:** ${proposedBeat.visualHook || 'TBD'}` : ''}`,
      name: 'PlotArchitect',
    })

    // Attach structured data for UI
    const messageWithMetadata = namedMessage as unknown as {
      actions?: unknown[]
      confidence?: number
      thinking?: string
      [key: string]: unknown
    }
    messageWithMetadata.actions = actions
    messageWithMetadata.confidence = confidence
    messageWithMetadata.thinking = parsed?.thinking

    console.log(
      'PlotArchitect returning',
      actions.length,
      'actions, beat:',
      proposedBeat?.logline?.slice(0, 50)
    )

    return {
      messages: [namedMessage],
      currentBeat: proposedBeat || undefined,
      characters: updatedCharacters !== state.characters ? updatedCharacters : undefined,
    }
  } catch (error) {
    console.error('Plot Architect error:', error)

    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    const errorMessage = new AIMessage({
      content: `⚠️ **Error**: ${errorMsg}\n\nI need the series bible and character context to propose appropriate beats.`,
      name: 'PlotArchitect',
    })
    return {
      messages: [errorMessage],
      shouldTerminate: true,
    }
  }
}
