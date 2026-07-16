import { AIMessage } from '@langchain/core/messages'
import { buildCrossDomainContext } from '@/shared/agent-kernel/context/cross-domain-context'
import { parseLoopAgentActionType } from '../../core/loop-agent-action-wire'
import { parseNextAgent } from '../../core/graph/agent-nodes'
import type { LoopCreatorState, NextAgent } from '../../core/graph/state'
import { v4 as uuidv4 } from 'uuid'

const SUPERVISOR_SPECIALISTS = [
  'loop_planner',
  'mechanics_designer',
  'balance_analyst',
  'progression_architect',
  'market_analyst',
] as const

const REFERENCE_GAME_PATTERNS = [
  /disco\s*elysium/gi,
  /case\s*of\s*(?:the\s*)?golden\s*idol/gi,
  /fallout\s*\d*/gi,
  /vampire\s*survivors?/gi,
  /hades/gi,
  /slay\s*the\s*spire/gi,
  /balatro/gi,
  /darkest\s*dungeon/gi,
  /tarkov/gi,
  /escape\s*from\s*tarkov/gi,
  /hunt:?\s*showdown/gi,
  /stardew\s*valley/gi,
  /hollow\s*knight/gi,
  /celeste/gi,
  /elden\s*ring/gi,
  /dark\s*souls?\s*\d*/gi,
  /returnal/gi,
  /dead\s*cells/gi,
  /binding\s*of\s*isaac/gi,
] as const

interface SupervisorParsedResponse {
  thinking: string
  nextAgent: NextAgent
  nextPhase: LoopCreatorState['currentPhase']
  message?: string
  questions?: Array<{ id?: string; question: string; options?: string[]; required?: boolean }>
  actions?: Array<{ type: string; payload: Record<string, unknown> }>
}

function buildStateContext(state: LoopCreatorState): string {
  const parts: string[] = []

  parts.push(`Session: ${state.sessionId}`)
  parts.push(`Phase: ${state.currentPhase}`)
  parts.push(`Round: ${state.roundCount}`)

  if (state.gameGenre) parts.push(`Genre: ${state.gameGenre}`)
  if (state.gamePlatform) parts.push(`Platform: ${state.gamePlatform}`)
  if (state.targetAudience) parts.push(`Audience: ${state.targetAudience}`)
  if (state.gameDescription) parts.push(`Description: ${state.gameDescription}`)

  parts.push('\n=== CURRENT CANVAS ===')
  parts.push(`Mechanics/Nodes: ${state.mechanics.length}`)
  if (state.mechanics.length > 0) {
    state.mechanics.forEach(mechanic => {
      const desc = mechanic.description ? ` - ${mechanic.description.slice(0, 60)}` : ''
      parts.push(`  • ${mechanic.name} (${mechanic.type})${desc}`)
    })
  } else {
    parts.push('  (No nodes on canvas yet)')
  }

  parts.push(`\nConnections: ${state.connections.length}`)
  if (state.connections.length > 0) {
    state.connections.forEach(connection => {
      parts.push(
        `  • ${connection.source} → ${connection.target}${connection.label ? ` (${connection.label})` : ''}`,
      )
    })
  }

  parts.push(`\nLoops: ${state.loops.length}`)
  if (state.loops.length > 0) {
    state.loops.forEach(loop => {
      parts.push(`  • ${loop.name} (${loop.type}): ${loop.description?.slice(0, 50) || 'No description'}`)
    })
  }

  parts.push(`Progression Systems: ${state.progressionSystems.length}`)

  if (state.balanceAnalysis) {
    parts.push(`\nBalance Score: ${state.balanceAnalysis.overallScore}/10`)
    parts.push(`Balance Issues: ${state.balanceAnalysis.issues.length}`)
  }

  return parts.join('\n')
}

function isSupervisorSpecialist(value: string): boolean {
  for (const specialist of SUPERVISOR_SPECIALISTS) {
    if (specialist === value) return true
  }
  return false
}

export function isComingFromSupervisorSpecialist(lastAgent?: string | null): boolean {
  return Boolean(lastAgent && isSupervisorSpecialist(lastAgent))
}

export async function buildSupervisorSystemPrompt(
  basePrompt: string,
  state: LoopCreatorState,
  comingFromSpecialist: boolean,
): Promise<string> {
  let systemPrompt = basePrompt.replace('{{STATE_CONTEXT}}', buildStateContext(state))

  if (state.projectId) {
    try {
      const crossDomainContext = await buildCrossDomainContext(state.projectId)
      if (crossDomainContext) {
        systemPrompt += `\n\n## Cross-Domain Entities (From Other Tools)\n${crossDomainContext}\n\nNOTE: You can reference these entities when designing game loops. For example, if there's a character from Storyteller, you can design mechanics tailored to that character.`
        console.log('[Supervisor] Loaded cross-domain context')
      }
    } catch (error) {
      console.warn('[Supervisor] Failed to load cross-domain context:', error)
    }
  }

  if (comingFromSpecialist) {
    systemPrompt += `\n\n## IMPORTANT: You just received results from ${state.lastAgent}
The specialist has completed their work. You MUST:
1. Provide a BRIEF acknowledgment (1-2 sentences max) - the specialist's detailed output is already visible to the user
2. DO NOT repeat or summarize the specialist's output - it's already displayed above your message  
3. Use "END" as nextAgent to wait for user's next request
4. Example good response: "Done! I've created some game loop nodes. Check the suggestion panel on the left to approve them, or let me know if you'd like changes."
5. Example BAD response: Repeating all the nodes, mechanics, and connections the specialist already created.
DO NOT route to another specialist unless the user explicitly asks for more.`
  }

  return systemPrompt
}

export function resolveSupervisorNextAgent(
  parsed: SupervisorParsedResponse,
  comingFromSpecialist: boolean,
): NextAgent {
  let nextAgent = parsed.nextAgent

  if (comingFromSpecialist) {
    console.log('[Supervisor] Coming from specialist - forcing END')
    return 'END'
  }

  if (parsed.message && (nextAgent === 'supervisor' || !nextAgent)) {
    console.log('[Supervisor] Has message but routing to self - forcing END')
    return 'END'
  }

  return nextAgent
}

export function extractSupervisorReferenceGames(state: LoopCreatorState): {
  referenceGames: string[]
  gameDescription?: string
} {
  const referenceGames = [...(state.referenceGames || [])]
  let gameDescription = state.gameDescription

  const lastUserMessage = [...state.messages].reverse().find(message => message._getType() === 'human')
  if (!lastUserMessage) {
    return { referenceGames }
  }

  const msgContent =
    typeof lastUserMessage.content === 'string'
      ? lastUserMessage.content
      : JSON.stringify(lastUserMessage.content)

  for (const pattern of REFERENCE_GAME_PATTERNS) {
    const matches = msgContent.match(pattern)
    if (!matches) continue
    for (const match of matches) {
      const normalized = match.trim()
      if (!referenceGames.some(game => game.toLowerCase() === normalized.toLowerCase())) {
        referenceGames.push(normalized)
      }
    }
  }

  if (!gameDescription && msgContent.length > 20) {
    gameDescription = msgContent
  }

  return { referenceGames, gameDescription }
}

export function buildSupervisorStateUpdate(
  parsed: SupervisorParsedResponse,
  state: LoopCreatorState,
  nextAgent: NextAgent,
  referenceGames: string[],
  gameDescription?: string,
): Partial<LoopCreatorState> {
  const result: Partial<LoopCreatorState> = {
    nextAgent: parseNextAgent(nextAgent),
    currentPhase: parsed.nextPhase,
    referenceGames:
      referenceGames.length > (state.referenceGames?.length || 0) ? referenceGames : undefined,
    gameDescription: gameDescription !== state.gameDescription ? gameDescription : undefined,
  }

  if (parsed.message) {
    result.messages = [
      new AIMessage({
        content: parsed.message,
        name: 'supervisor',
      }),
    ]
  }

  if (parsed.questions && parsed.questions.length > 0) {
    result.pendingQuestions = parsed.questions.map(question => ({
      id: question.id || uuidv4(),
      question: question.question,
      options: question.options,
      required: question.required ?? false,
    }))
  }

  if (parsed.actions && parsed.actions.length > 0) {
    console.log(
      `[Supervisor] Emitting ${parsed.actions.length} actions:`,
      parsed.actions.map(action => action.type),
    )
    result.pendingActions = parsed.actions.flatMap(action => {
      const type = parseLoopAgentActionType(action.type)
      if (!type) return []
      return [
        {
          type,
          payload: action.payload,
          confidence: 1.0,
          reasoning: parsed.thinking,
        },
      ]
    })
  }

  return result
}
