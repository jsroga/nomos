import { WritersRoomState, BeatCard } from '../graph/state'
import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { assembleContext } from '../context/assembler'
import { AgentAction } from '../actions/types'
import { v4 as uuidv4 } from 'uuid'
import { getModel } from '../config/model-config'
import {
  PlotArchitectResponseSchema,
  PlotArchitectResponse,
  parseAgentResponse,
} from '../schemas/agent-schemas'

import { getSafeMessageHistory } from '../utils/message-utils'
import { loadPromptCached } from '../prompts/hub-loader'

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
  const promptMessages = (loadedPrompt.prompt as any).promptMessages || (loadedPrompt.prompt as any).messages || []
  const systemMessage = promptMessages.find((m: any) => m.lc_id?.[3] === 'SystemMessagePromptTemplate' || m._type === 'system')
  const systemTemplate = systemMessage?.prompt?.template || systemMessage?.template || PLOT_ARCHITECT_STRUCTURED_PROMPT

  // Combine system content into single message (required for Claude)
  const combinedSystem = [context.systemPrompt, context.stateContext, systemTemplate].join('\n\n---\n\n')
  const conversationMessages = getSafeMessageHistory(state.messages, 6).filter(m => m._getType() !== 'system')

  const messages = [
    new SystemMessage(combinedSystem),
    ...conversationMessages,
  ]

  try {
    // Try structured output first
    let parsed: PlotArchitectResponse | null = null
    let proposedBeat: BeatCard | null = null
    let actions: AgentAction[] = []

    try {
      const structuredModel = model.withStructuredOutput(PlotArchitectResponseSchema)
      parsed = (await structuredModel.invoke(messages)) as PlotArchitectResponse
    } catch (structuredError) {
      console.warn(
        'Plot Architect: Structured output failed, falling back to manual parsing',
        structuredError
      )

      // Fallback to manual parsing
      const response = await model.invoke(messages)
      const content =
        typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
      parsed = parseAgentResponse(content, PlotArchitectResponseSchema)

      if (!parsed) {
        // Last resort: try regex parsing
        proposedBeat = parseBeatFromResponse(content, state.episodeId)
        parsed = {
          message: content,
          actions: [],
          confidence: 0.5,
        }
      }
    }

    // Extract actions directly from parsed response
    if (parsed && parsed.actions) {
      actions = parsed.actions as AgentAction[];
    }

    // Backward compatibility: If no actions found but we parsed a "proposedBeat" from text regex
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
      });
    }

    // Update currentBeat reference for the UI if we created one
    const createBeatAction = actions.find(a => a.type === 'CREATE_BEAT');
    if (createBeatAction && !proposedBeat) {
      const payload = createBeatAction.payload as any;
      proposedBeat = {
        id: uuidv4(),
        episodeId: state.episodeId || 'default',
        sequence: state.beatBoard.length + 1,
        logline: payload.logline,
        beatType: payload.beatType || 'complication',
        charactersInvolved: payload.charactersInvolved || [],
        emotionalShifts: payload.emotionalShifts || {},
        visualHook: payload.visualHook || '',
        causalDependencies: [],
        setupsPayoffs: {},
        status: 'proposed',
        mazurElements: payload.mazurElements,
      };
    }

    // Apply Character Metric Updates if present in actions
    // This allows the beat to immediately affect character state
    let updatedCharacters = [...state.characters];
    for (const action of actions) {
      if (action.type === 'UPDATE_CHARACTER_METRICS') {
        const { characterId, changes, reason } = (action.payload as any)
        updatedCharacters = updatedCharacters.map(char => {
          if (char.characterId === characterId || char.name === characterId) {
            const updatedMetrics = { ...char.metrics }
            // Apply numeric changes
            if (changes.valence !== undefined) updatedMetrics.valence = Math.min(100, Math.max(-100, (updatedMetrics.valence || 0) + changes.valence))
            if (changes.arousal !== undefined) updatedMetrics.arousal = Math.min(100, Math.max(0, (updatedMetrics.arousal || 50) + changes.arousal))
            if (changes.autonomy !== undefined) updatedMetrics.autonomy = Math.min(100, Math.max(0, (updatedMetrics.autonomy || 60) + changes.autonomy))
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
                  timestamp: Date.now()
                }
              ]
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
      characters: updatedCharacters !== state.characters ? updatedCharacters : undefined
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
