import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { BaseMessage } from '@langchain/core/messages'
import { StreamCallback } from '../guardrails/types'
import { BibleSection } from '../prompts/section-prompts'
import {
  PremiseArchitectResponse,
  PremiseArchitectResponseSchema,
  parseAgentResponse,
} from '../schemas/agent-schemas'
import { extractMessageFromContent } from './parsers'

let lastDetectedProgressSection = ''

/**
 * Detect progress based on LLM output and emit section-focus events
 */
export function detectAndEmitSectionProgress(content: string, streamCallback: StreamCallback) {
  const lower = content.toLowerCase()

  const sections: Array<{ key: string; keywords: string[]; label: string }> = [
    {
      key: 'worldDescription',
      keywords: ['world description', 'environment'],
      label: 'Atmosphere',
    },
    { key: 'worldRules', keywords: ['world rules', 'laws', 'magic system'], label: 'Rules' },
    { key: 'factions', keywords: ['factions', 'groups', 'powers'], label: 'Factions' },
    { key: 'keyCharacters', keywords: ['key characters', 'protagonist'], label: 'Cast' },
    { key: 'episodeRoadmap', keywords: ['episode roadmap', 'season arc'], label: 'Roadmap' },
    { key: 'soundtracks', keywords: ['soundtrack', 'music', 'recommendations'], label: 'Music' },
  ]

  for (const section of sections) {
    if (section.keywords.some(k => lower.includes(k))) {
      if (lastDetectedProgressSection !== section.key) {
        lastDetectedProgressSection = section.key
        streamCallback({
          type: 'agent_status',
          status: 'thinking',
          message: `Designing ${section.label}...`,
          agent: 'PremiseArchitect',
        })
      }
      break
    }
  }
}

/**
 * Stream the premise generation with token-by-token progress callbacks
 */
export async function streamPremiseGeneration(
  model: BaseChatModel,
  messages: BaseMessage[],
  streamCallback: StreamCallback,
  section: BibleSection = 'full'
): Promise<{ parsed: PremiseArchitectResponse | null; fullContent: string }> {
  let fullContent = ''
  let tokenCount = 0

  try {
    // Use model.stream() for token-by-token streaming
    const stream = await model.stream(messages)

    for await (const chunk of stream) {
      const token = typeof chunk.content === 'string' ? chunk.content : ''
      if (token) {
        fullContent += token
        tokenCount++

        // Emit token progress every token (or could batch for performance)
        streamCallback({
          type: 'token',
          agent: 'PremiseArchitect',
          token,
          progress: Math.min(tokenCount / 100, 0.99), // Rough progress estimate
        })

        // Detect sections being generated and emit section progress
        detectAndEmitSectionProgress(fullContent, streamCallback)
      }
    }

    // Signal streaming complete
    streamCallback({
      type: 'section_complete',
      agent: 'PremiseArchitect',
      section: section === 'full' ? 'full_bible' : section,
      content: fullContent.substring(0, 200) + '...', // Preview
    })

    // Parse the accumulated content
    const parsed = parseAgentResponse(fullContent, PremiseArchitectResponseSchema)

    return {
      parsed: parsed || {
        message: extractMessageFromContent(fullContent),
        actions: [],
        confidence: 0.5,
      },
      fullContent,
    }
  } catch (error) {
    console.error('Streaming error in Premise Architect:', error)

    // Return what we have so far
    return {
      parsed: {
        message: fullContent || 'Error during generation',
        actions: [],
        confidence: 0.3,
      },
      fullContent,
    }
  }
}
