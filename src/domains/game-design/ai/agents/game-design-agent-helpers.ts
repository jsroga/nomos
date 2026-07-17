import type { GameDesignContext } from './game-design-agent'
import type { GameLoop, GameMechanic } from '../../core/schemas'
import { GameDesignContextHeader } from '../constants/game-design-context-wire'
import {
  ConversationRole,
  ConversationRoleLabel,
  GameDesignAgentCopy,
  GameDesignLoopTypeDefault,
  ListSeparator,
  NewlineSeparator,
} from '../constants/agent-copy'
import {
  GameDesignResponseType,
  parseGameDesignResponseRecord,
  type GameDesignResponse,
} from '../constants/game-design-response'

function appendOptionalLine(parts: string[], label: string, value: string | undefined): void {
  if (value) {
    parts.push(`${label}${value}`)
  }
}

function formatLoopLine(loop: GameLoop): string {
  const nodeCount = loop.nodes?.length ?? 0
  const edgeCount = loop.edges?.length ?? 0
  return `- ${loop.name} (${loop.type}): ${nodeCount} nodes, ${edgeCount} edges`
}

function formatMechanicLine(mech: GameMechanic): string {
  const description = mech.description || GameDesignAgentCopy.NoDescription
  return `- ${mech.name} (${mech.type}): ${description}`
}

export function buildGameDesignContextString(context: GameDesignContext): string {
  const parts: string[] = [`## Project: ${context.projectId}`]

  appendOptionalLine(parts, GameDesignContextHeader.Genre, context.genre)
  appendOptionalLine(parts, GameDesignContextHeader.Platform, context.platform)
  appendOptionalLine(parts, GameDesignContextHeader.TargetAudience, context.targetAudience)
  appendOptionalLine(parts, GameDesignContextHeader.GameConcept, context.gameDescription)
  appendOptionalLine(parts, GameDesignContextHeader.Theme, context.theme)

  if (context.existingLoops?.length) {
    parts.push(GameDesignAgentCopy.ExistingLoopsHeader)
    for (const loop of context.existingLoops) {
      parts.push(formatLoopLine(loop))
    }
  }

  if (context.existingMechanics?.length) {
    parts.push(GameDesignAgentCopy.ExistingMechanicsHeader)
    for (const mech of context.existingMechanics) {
      parts.push(formatMechanicLine(mech))
    }
  }

  return parts.join(NewlineSeparator.Single)
}

export function formatRecentConversation(
  messages: { role: 'user' | 'assistant'; content: string }[]
): string {
  return messages
    .map(message => {
      const label =
        message.role === ConversationRole.User
          ? ConversationRoleLabel.User
          : ConversationRoleLabel.Assistant
      return `${label}: ${message.content}`
    })
    .join(NewlineSeparator.Double)
}

export function buildDesignLoopUserMessage(input: {
  genre: string
  targetAudience: string
  theme?: string
  loopType?: 'core' | 'meta' | 'social' | 'monetization'
  referenceGames?: string[]
}): string {
  const loopType = input.loopType ?? GameDesignLoopTypeDefault.Core
  const themeSuffix = input.theme ? ` Theme: ${input.theme}.` : ''
  const referenceSuffix = input.referenceGames?.length
    ? ` Reference games: ${input.referenceGames.join(ListSeparator.CommaSpace)}.`
    : ''
  return `Design a ${loopType} game loop for a ${input.genre} game targeting ${input.targetAudience} players.${themeSuffix}${referenceSuffix}`
}

export function parseGameDesignAgentResponse(text: string): GameDesignResponse {
  const thinkingMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/i)
  const thought = thinkingMatch ? thinkingMatch[1].trim() : text

  const afterThinking = thinkingMatch
    ? text.slice(text.indexOf('</thinking>') + '</thinking>'.length).trim()
    : text.trim()

  const jsonMatch = afterThinking.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = parseGameDesignResponseRecord(JSON.parse(jsonMatch[0]), thought)
      if (parsed) return parsed
    } catch {
      // Not valid JSON, continue
    }
  }

  const toolMatch = text.match(/Tool Result:?\s*({[\s\S]*?})/i)
  if (toolMatch) {
    try {
      const toolResult: unknown = JSON.parse(toolMatch[1])
      return {
        type: GameDesignResponseType.ExecuteStep,
        payload: {
          tool: GameDesignAgentCopy.ToolAnalysis,
          result: toolResult,
        },
        thought,
      }
    } catch {
      // Not valid JSON, continue
    }
  }

  return {
    type: GameDesignResponseType.Finish,
    payload: { result: text },
    thought,
  }
}
