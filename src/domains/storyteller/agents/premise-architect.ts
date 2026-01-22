/**
 * Premise Architect Agent
 *
 * Generates the "World Bible" and "Initial Conflicts" (The Gardener Approach).
 * Instead of a rigid 8-sequence structure, this builds the soil (World),
 * plants the seeds (Factions/Characters), and watches them grow (Inciting Incident).
 *
 * Supports section-focused updates with smart merge capabilities.
 *
 * NEW: Supports token-level streaming for better UX during long generations.
 */

import { AIMessage, BaseMessage, SystemMessage } from '@langchain/core/messages'
import { WritersRoomState } from '../graph/state'
import { getModel } from '../config/model-config'
import { AgentAction } from '../actions/types'
import {
  PremiseArchitectResponseSchema,
  PremiseArchitectResponse,
  parseAgentResponse,
  StoryPlanSchema,
  StoryPlan,
  StorySequence,
  WorldRule,
  Faction,
  SoundtrackTrack,
  KeyCharacter,
} from '../schemas/agent-schemas'

import { getSafeMessageHistory } from '../utils/message-utils'
import { StreamCallback, WritersRoomStateWithStream } from '../guardrails/types'
import { loadPromptCached } from '../prompts/hub-loader'
import { PROMPT_IDS } from '../config/storyteller-config'

import {
  BibleSection,
  SectionDetection,
  SECTION_PROMPTS,
  SECTION_TO_PROMPT_ID,
} from '../prompts/section-prompts'
import { extractActionsFromText, generateProposalMessage } from '../utils/agent-fallbacks'
import { checkBibleLock, buildAgentContext } from '../utils/agent-context-utils'
import { extractMessageFromContent } from '../utils/parsers'
import { detectAndEmitSectionProgress, streamPremiseGeneration } from '../utils/streaming-utils'
import {
  PROGRESSIVE_SECTIONS,
  generateBibleProgressively,
  buildStoryPlanFromSections,
} from '../utils/progressive-gen-utils'
import { PREMISE_ARCHITECT_SYSTEM_PROMPT } from '../prompts/section-prompts'

// Model is created inside the function to use request-scoped config (AsyncLocalStorage)

// Core logic and prompts moved to utility and prompt modules

export const premiseArchitectAgent = async (
  state: WritersRoomState | WritersRoomStateWithStream
): Promise<Partial<WritersRoomState>> => {
  // Build context and check permissions
  const lockNotice = checkBibleLock(state)
  if (lockNotice) {
    return { messages: [lockNotice], awaitingUserInput: true }
  }

  const existingBible = state.seriesBible || {}
  const storyPlan = existingBible.storyPlan || existingBible
  const masterPrompt = state.masterPrompt || ''

  const conversationMessages = getSafeMessageHistory(state.messages, 5).filter(
    m => m._getType() !== 'system'
  )
  const lastUserMessage = conversationMessages
    .slice()
    .reverse()
    .find(m => m._getType() === 'human')
  const userInstruction =
    typeof lastUserMessage?.content === 'string' ? lastUserMessage.content : ''

  const { systemPrompt, contextMessage, section, isSectionUpdate } = await buildAgentContext(
    userInstruction,
    existingBible,
    storyPlan,
    masterPrompt
  )

  console.log(
    `Premise Architect: ${isSectionUpdate ? `Section update [${section}]` : 'Full bible generation'}`
  )

  // Signal streaming start if callback provided
  const streamCallback: StreamCallback | undefined = (state as WritersRoomStateWithStream)
    ._streamCallback
  if (streamCallback) {
    streamCallback({
      type: 'section_start',
      agent: 'PremiseArchitect',
      section: isSectionUpdate ? section : 'full_bible',
    })
  }

  // Combine system content into single message (required for Claude)
  const combinedSystem = [systemPrompt, contextMessage].join('\n\n---\n\n')
  const messages = [new SystemMessage(combinedSystem), ...conversationMessages]

  // Check if progressive generation is requested
  const useProgressiveGeneration = (state as any)._useProgressiveGeneration === true

  try {
    // Try structured output first
    let parsed: PremiseArchitectResponse | null = null
    let actions: AgentAction[] = []

    // If streaming callback is provided AND we're doing full bible generation,
    // use streaming mode for better UX
    if (streamCallback && !isSectionUpdate) {
      if (useProgressiveGeneration) {
        // Use progressive section-by-section generation
        console.log('Premise Architect: Using progressive generation mode')
        const progressiveSections = await generateBibleProgressively(
          model,
          contextMessage,
          userInstruction,
          streamCallback,
          existingBible
        )

        // Build story plan from progressive sections
        const storyPlan = buildStoryPlanFromSections(progressiveSections)

        parsed = {
          message: 'World Bible generated progressively. Review each section above.',
          actions: [
            {
              type: 'UPDATE_SERIES_BIBLE',
              payload: { storyPlan },
            },
          ] as any,
          confidence: 0.8,
        }
        actions = parsed.actions as any
      } else {
        // Use standard streaming for full bible generation
        const streamResult = await streamPremiseGeneration(model, messages, streamCallback)
        parsed = streamResult.parsed
        actions = (parsed?.actions || []) as any
      }
    } else {
      // Use standard structured output for section updates
      try {
        const structuredModel = model.withStructuredOutput(PremiseArchitectResponseSchema)
        parsed = (await structuredModel.invoke(messages)) as PremiseArchitectResponse
        actions = (parsed.actions || []) as any
      } catch (structuredError) {
        console.warn(
          'Premise Architect: Structured output failed, falling back to manual parsing',
          structuredError
        )

        // Fallback to manual parsing
        // Use a fresh copy of messages for the fallback call, filtering out any orphan tool calls
        // or malformed history that might have caused the structured output to fail if it was an API error.
        const fallbackMessages = getSafeMessageHistory(state.messages, 5).filter(
          m => m._getType() !== 'system'
        )
        const response = await model.invoke([
          new SystemMessage(combinedSystem),
          ...fallbackMessages,
        ])
        const content =
          typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
        parsed = parseAgentResponse(content, PremiseArchitectResponseSchema)

        if (!parsed) {
          // Even if full schema parsing failed, try to extract any storyPlan-like content
          // This handles cases where LLM returns a valid storyPlan object but doesn't match the exact schema
          let extractedStoryPlan = null
          let extractedActions: AgentAction[] = []

          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              const rawParsed = JSON.parse(jsonMatch[0])

              // Extract actions array if present (for section updates like UPDATE_SOUNDTRACKS)
              if (rawParsed.actions && Array.isArray(rawParsed.actions)) {
                extractedActions = rawParsed.actions
                console.log(
                  'PremiseArchitect: Extracted actions from fallback:',
                  extractedActions.map(a => a.type)
                )
              }

              // Check for storyPlan at various locations the LLM might put it
              extractedStoryPlan =
                rawParsed.storyPlan ||
                rawParsed.payload?.storyPlan ||
                rawParsed.actions?.[0]?.payload?.storyPlan ||
                (rawParsed.worldDescription ? rawParsed : null) // The object itself might be a storyPlan
            }
          } catch (e) {
            console.warn('PremiseArchitect: Could not extract from fallback content:', e)
          }

          // ENHANCED FALLBACK: Use centralized utility for extraction
          const messageText = extractMessageFromContent(content)
          if (isSectionUpdate) {
            extractedActions = extractActionsFromText(section, messageText, extractedActions)
          }

          parsed = {
            message: messageText,
            actions: extractedActions,
            confidence: extractedActions.length > 0 ? 0.8 : 0.5,
            storyPlan: extractedStoryPlan,
          } as any
        }
        actions = (parsed.actions || []) as any
      }
    }

    // ADDITIONAL FALLBACK: If parsed but no actions, try to extract from message content
    if (isSectionUpdate && actions.length === 0 && parsed?.message) {
      actions = extractActionsFromText(section, parsed.message, actions)
    }

    // Generate user-friendly message for section updates
    const messageContent = generateProposalMessage(parsed.message || '', actions, section)

    const confidence = parsed.confidence ?? 0.8

    const namedMessage = new AIMessage({
      content: messageContent,
      name: 'PremiseArchitect',
    })

    // Attach actions for UI and execution
    console.log(
      `PremiseArchitect: Attaching ${actions.length} actions to message:`,
      actions.map(a => `${a.type} (payload: ${a.payload ? 'yes' : 'no'})`)
    )
    ;(namedMessage as any).actions = actions
    ;(namedMessage as any).confidence = confidence

    // Extract story plan from:
    // 1. Actions array (the proper structured output path)
    // 2. Top-level storyPlan field (common when LLM doesn't follow action structure)
    // 3. Synthesize action if storyPlan exists but actions is empty
    let storyPlan = null
    const bibleAction = actions.find(a => a.type === 'UPDATE_SERIES_BIBLE')
    if (bibleAction?.payload?.storyPlan) {
      storyPlan = bibleAction.payload.storyPlan
    } else if (parsed?.storyPlan) {
      // LLM returned storyPlan at top level but not as an action
      // This happens when structured output partially works
      storyPlan = parsed.storyPlan
      console.log(
        'PremiseArchitect: Found storyPlan at top level, synthesizing UPDATE_SERIES_BIBLE action'
      )

      // Synthesize the action so it gets persisted properly
      const synthesizedAction = {
        type: 'UPDATE_SERIES_BIBLE' as const,
        payload: { storyPlan },
      }
      actions = [synthesizedAction as any]
      // Also attach to message for downstream handlers
      ;(namedMessage as any).actions = actions
    }

    // SMART TERMINATION: Pause after generating premise for user review
    console.log('PremiseArchitect: World & Conflict generated - pausing for user review')

    return {
      messages: [namedMessage],
      seriesBible: storyPlan
        ? {
            ...state.seriesBible,
            ...storyPlan, // Merge all storyPlan fields directly into seriesBible
          }
        : state.seriesBible,
      awaitingUserInput: true, // Pause for user to review/approve premise
    }
  } catch (error) {
    console.error('Premise Architect error:', error)

    const errorMessage = new AIMessage({
      content: `⚠️ **Error generating story structure**: ${error instanceof Error ? error.message : 'Unknown error'}

Please describe your story idea and I'll create a World Bible for you.`,
      name: 'PremiseArchitect',
    })

    return {
      messages: [errorMessage],
    }
  }
}
