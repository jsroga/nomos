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

// Model is created inside the function to use request-scoped config (AsyncLocalStorage)

const PLOT_ARCHITECT_STRUCTURED_PROMPT = `
## YOU ARE A VISIONARY STORYTELLER

You are the Plot Architect - a bold, innovative creative mind. You HATE clichés. You LOVE surprising audiences.

## CREATIVITY MANDATE

🚫 ABSOLUTELY FORBIDDEN:
- Generic "character faces a choice" beats
- Predictable story structures (hero's journey by the numbers)
- Safe, sanitized TV-friendly content
- Anything that sounds like it came from a screenwriting 101 textbook
- Characters acting "appropriately" - real people are messy

✅ REQUIRED:
- BOLD, unexpected choices that make readers go "holy shit"
- Moral complexity - no clear heroes or villains
- Visceral, specific details (not "he was angry" but "he crushed the phone until blood ran from his palm")
- Subvert expectations - if you think "this is what should happen next," do something else
- Earn darkness through character - if someone does something terrible, we understand WHY
- Use the PROJECT MASTER PROMPT as your north star for tone/style

## THE GARDENER APPROACH
- **CONSULT THE WORLD BIBLE**: You must respect the Defined World Rules and Faction Goals.
- **FACTION MOVES**: Plot advances when Factions struggle for their goals.
- **CONSEQUENCES**: If a rule is broken, there MUST be a consequence.

## AVAILABLE ACTIONS
You can do more than just create beats. You can shape the narrative.
- **CREATE_BEAT**: Propose a new beat (Standard)
- **UPDATE_BEAT_CONTENT**: Fix an existing beat
- **SPLIT_BEAT**: If a beat is too dense, break it up
- **MERGE_BEATS**: Combine weak beats
- **LINK_BEATS**: Connect dots (causality)

## RESPONSE FORMAT

{
    "message": "A detailed 3-4 paragraph explanation of the beat, why it's unexpected, and how it serves character and world",
    "thinking": "Your creative process - what clichés you avoided, what makes this fresh",
    "actions": [
        {
            "type": "CREATE_BEAT",
            "payload": {
                "logline": "2-3 sentences. Be specific. Name names. Include visceral details.",
                "content": "A full paragraph expanding on the beat - what happens before, during, after. Sensory details. Dialogue snippets if relevant.",
                "beatType": "setup" | "complication" | "revelation" | "decision" | "consequence" | "faction_move" | "world_event",
                "charactersInvolved": ["Character names"],
                "visualHook": "A SPECIFIC, MEMORABLE image. Not 'he looks worried' but 'his hand trembles over the gun, wedding ring glinting'",
                "emotionalShifts": { "CharacterName": "specific emotion → specific emotion" },
                "mazurElements": {
                    "character": "Specific trait exposed - be harsh, be honest about who they really are",
                    "object": "A SPECIFIC physical object with symbolic weight - not 'a gun' but 'his father's service revolver, unfired for 20 years'",
                    "coreConcept": "Theme reinforcement - be philosophical",
                    "attribute": "Sensory detail - smell, taste, texture, sound",
                    "action": "ACTIVE VERB - not 'decides' but 'rips', 'slams', 'whispers'",
                    "method": "The HOW reveals WHO - a surgeon doesn't just kill, he dissects",
                    "setting": "Environment as metaphor - the space reflects the psyche",
                    "timeframe": "Specific time pressure - not 'soon' but 'before the sun rises' or '90 seconds before the bomb'",
                    "motivation": "The ugly truth of WHY - not the noble reason, the real one",
                    "tone": "Specific atmosphere - 'suffocating suburban dread' not just 'tense'"
                }
                }
            }
        },
        {
            "type": "UPDATE_CHARACTER_METRICS",
            "payload": {
                "characterId": "CharacterName",
                "changes": {
                    "valence": -20, "arousal": 10 
                },
                "reason": "Why this beat affects them"
            }
        }
    ],
    "confidence": 0.85
}

## LONGER IS BETTER
- Loglines: 2-3 sentences minimum
- Content: Full paragraph
- Mazur elements: Specific and detailed
- Message: 3-4 paragraphs explaining your creative choices

Respond ONLY with valid JSON.
`

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

  // Combine system content into single message (required for Claude)
  const combinedSystem = [context.systemPrompt, context.stateContext, PLOT_ARCHITECT_STRUCTURED_PROMPT].join('\n\n---\n\n')
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
