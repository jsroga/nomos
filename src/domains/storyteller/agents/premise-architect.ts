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
import {
  detectTargetSection,
  resetSectionDetection,
  buildSectionContext,
} from '../utils/section-utils'
import {
  extractMessageFromContent,
  extractSoundtracksFromText,
  extractWorldRulesFromText,
  extractFactionsFromText,
  extractKeyCharactersFromText,
  extractPlotTwistsFromText,
  extractInspirationsFromText,
} from '../utils/parsers'
import {
  detectAndEmitSectionProgress,
  streamPremiseGeneration,
} from '../utils/streaming-utils'
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
  // Reset section detection for fresh tracking
  resetSectionDetection()

  // Create model inside function to use request-scoped config
  const model = getModel('premiseArchitect')

  // =========================================================================
  // BIBLE LOCK CHECK - Block generation if Bible is locked
  // =========================================================================
  const isBibleLocked = state.seriesBible?.isLocked === true
  const userEmail = state.userEmail?.toLowerCase() || ''

  // Check if user is admin
  const centralUsers = (process.env.NEXT_PUBLIC_CENTRAL_USERS || 'jacek.sroga.itc@gmail.com')
    .split(',')
    .map(e => e.trim().toLowerCase())
  const isAdmin = centralUsers.includes(userEmail)

  if (isBibleLocked && !isAdmin) {
    console.log('🔒 Premise Architect: Bible is LOCKED - blocking generation')

    const lockMessage = new AIMessage({
      content: `🔒 **World Bible is Locked**

The Series Bible has been locked by an administrator. While locked, I cannot make any changes to:
- World Description, World Rules, Factions
- Key Characters, Inspirations, Soundtracks
- Plot Twists, Episode Roadmap

**What you can do instead:**
- 📝 Work on individual **Episode Premises**
- 🎬 Create and break **Story Beats**
- 👥 Develop character arcs within episodes
- 📖 Read and reference the World Bible (read-only)

💡 *Ask your admin to unlock the Bible if you need to make changes.*`,
      name: 'PremiseArchitect',
    })

    return {
      messages: [lockMessage],
      awaitingUserInput: true,
    }
  }
  // =========================================================================

  // Check for streaming callback
  const streamCallback: StreamCallback | undefined = (state as WritersRoomStateWithStream)
    ._streamCallback

  // Build context from user input and any existing bible
  const existingBible = state.seriesBible || {}

  const storyPlan = existingBible.storyPlan || existingBible // Handle both old container and new direct object
  const masterPrompt = state.masterPrompt || ''

  // Get the last user message to detect section-focused updates
  const conversationMessages = getSafeMessageHistory(state.messages, 5).filter(
    m => m._getType() !== 'system'
  )
  const lastUserMessage = conversationMessages
    .slice()
    .reverse()
    .find(m => m._getType() === 'human')
  const userInstruction =
    typeof lastUserMessage?.content === 'string' ? lastUserMessage.content : ''

  // Detect if this is a section-focused update
  const { section } = detectTargetSection(userInstruction)
  const isSectionUpdate = section !== 'full'

  console.log(
    `Premise Architect: ${isSectionUpdate ? `Section update [${section}]` : 'Full bible generation'}`
  )

  // Signal streaming start if callback provided
  if (streamCallback) {
    streamCallback({
      type: 'section_start',
      agent: 'PremiseArchitect',
      section: isSectionUpdate ? section : 'full_bible',
    })
  }

  // Build context based on update type
  let systemPrompt: string
  let contextMessage: string

  const promptId = SECTION_TO_PROMPT_ID[section]
  const loadedPrompt = await loadPromptCached(promptId)

  // Extract system template from ChatPromptTemplate
  // This is a bit of a hack since LangChain's ChatPromptTemplate isn't just a string
  const promptMessages =
    (loadedPrompt.prompt as any).promptMessages || (loadedPrompt.prompt as any).messages || []
  const systemMessage = promptMessages.find(
    (m: BaseMessage) =>
      (m as any).lc_id?.[3] === 'SystemMessagePromptTemplate' || (m as any)._type === 'system'
  )
  const systemTemplate =
    systemMessage?.prompt?.template ||
    systemMessage?.template ||
    (isSectionUpdate ? SECTION_PROMPTS[section] : PREMISE_ARCHITECT_SYSTEM_PROMPT)

  if (isSectionUpdate) {
    // Section-focused update - minimal context, focused prompt
    systemPrompt = systemTemplate

    // Include relevant existing content for context
    const sectionContext = buildSectionContext(section, existingBible, storyPlan)

    contextMessage = `
## EXISTING WORLD CONTEXT (For Reference)

**Title:** ${storyPlan.title || existingBible.title || 'Untitled'}
**Genre:** ${storyPlan.genre || existingBible.genre || 'Not defined'}
**Tone:** ${storyPlan.tone || existingBible.tone || 'Not defined'}

${sectionContext}

## USER'S REQUEST
${userInstruction}

    Generate the update for the ${section} section. Use smart merge to preserve existing content while incorporating changes.
`
  } else {
    // Full bible generation
    systemPrompt = PREMISE_ARCHITECT_SYSTEM_PROMPT

    contextMessage = `
## PROJECT CONTEXT

${masterPrompt ? `**Master Prompt (Project Style):**\n${masterPrompt}\n` : ''}

${existingBible.genre ? `**Established Genre:** ${existingBible.genre}` : ''}
${existingBible.tone ? `**Established Tone:** ${existingBible.tone}` : ''}
${existingBible.themes ? `**Established Themes:** ${existingBible.themes.join(', ')}` : ''}

## USER'S STORY IDEA
Based on the conversation, create the World Bible and Initial Conflict.
`
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

          // ENHANCED FALLBACK: Extract data from conversational response for ALL section types
          // When LLM doesn't follow JSON format but provides content in text
          const messageText = extractMessageFromContent(content)

          if (isSectionUpdate) {
            switch (section) {
              case 'soundtracks': {
                const existingAction = extractedActions.find(a => a.type === 'UPDATE_SOUNDTRACKS')
                const hasValidPayload = (existingAction?.payload as any)?.soundtracks?.length > 0
                if (!hasValidPayload) {
                  const soundtracks = extractSoundtracksFromText(messageText)
                  if (soundtracks.length > 0) {
                    console.log(
                      `PremiseArchitect: Extracted ${soundtracks.length} soundtracks from text`
                    )
                    extractedActions = extractedActions.filter(a => a.type !== 'UPDATE_SOUNDTRACKS')
                    extractedActions.push({
                      type: 'UPDATE_SOUNDTRACKS',
                      payload: { soundtracks, mergeMode: 'replace' },
                    } as any)
                  }
                }
                break
              }
              case 'worldRules': {
                const existingAction = extractedActions.find(a => a.type === 'UPDATE_WORLD_RULES')
                const hasValidPayload = (existingAction?.payload as any)?.rules?.length > 0
                if (!hasValidPayload) {
                  const rules = extractWorldRulesFromText(messageText)
                  if (rules.length > 0) {
                    console.log(`PremiseArchitect: Extracted ${rules.length} world rules from text`)
                    extractedActions = extractedActions.filter(a => a.type !== 'UPDATE_WORLD_RULES')
                    extractedActions.push({
                      type: 'UPDATE_WORLD_RULES',
                      payload: { rules, mergeMode: 'smart' },
                    } as any)
                  }
                }
                break
              }
              case 'factions': {
                const existingAction = extractedActions.find(a => a.type === 'UPDATE_FACTIONS')
                const hasValidPayload = (existingAction?.payload as any)?.factions?.length > 0
                if (!hasValidPayload) {
                  const factions = extractFactionsFromText(messageText)
                  if (factions.length > 0) {
                    console.log(`PremiseArchitect: Extracted ${factions.length} factions from text`)
                    extractedActions = extractedActions.filter(a => a.type !== 'UPDATE_FACTIONS')
                    extractedActions.push({
                      type: 'UPDATE_FACTIONS',
                      payload: { factions, mergeMode: 'smart' },
                    } as any)
                  }
                }
                break
              }
              case 'keyCharacters': {
                const existingAction = extractedActions.find(
                  a => a.type === 'UPDATE_KEY_CHARACTERS'
                )
                const hasValidPayload = (existingAction?.payload as any)?.keyCharacters?.length > 0
                if (!hasValidPayload) {
                  const keyCharacters = extractKeyCharactersFromText(messageText)
                  if (keyCharacters.length > 0) {
                    console.log(
                      `PremiseArchitect: Extracted ${keyCharacters.length} key characters from text`
                    )
                    extractedActions = extractedActions.filter(
                      a => a.type !== 'UPDATE_KEY_CHARACTERS'
                    )
                    extractedActions.push({
                      type: 'UPDATE_KEY_CHARACTERS',
                      payload: { keyCharacters, mergeMode: 'smart' },
                    } as any)
                  }
                }
                break
              }
              case 'plotTwists': {
                const existingAction = extractedActions.find(a => a.type === 'UPDATE_PLOT_TWISTS')
                const hasValidPayload = (existingAction?.payload as any)?.plotTwists?.length > 0
                if (!hasValidPayload) {
                  const plotTwists = extractPlotTwistsFromText(messageText)
                  if (plotTwists.length > 0) {
                    console.log(
                      `PremiseArchitect: Extracted ${plotTwists.length} plot twists from text`
                    )
                    extractedActions = extractedActions.filter(a => a.type !== 'UPDATE_PLOT_TWISTS')
                    extractedActions.push({
                      type: 'UPDATE_PLOT_TWISTS',
                      payload: { plotTwists, mergeMode: 'replace' },
                    } as any)
                  }
                }
                break
              }
              case 'inspirations': {
                const existingAction = extractedActions.find(a => a.type === 'UPDATE_INSPIRATIONS')
                const payload = existingAction?.payload as any
                const hasValidPayload =
                  payload?.inspirations &&
                  (payload.inspirations.books?.length > 0 ||
                    payload.inspirations.movies?.length > 0 ||
                    payload.inspirations.games?.length > 0)
                if (!hasValidPayload) {
                  const inspirations = extractInspirationsFromText(messageText)
                  if (
                    inspirations.books.length > 0 ||
                    inspirations.movies.length > 0 ||
                    inspirations.games.length > 0
                  ) {
                    console.log('PremiseArchitect: Extracted inspirations from text')
                    extractedActions = extractedActions.filter(
                      a => a.type !== 'UPDATE_INSPIRATIONS'
                    )
                    extractedActions.push({
                      type: 'UPDATE_INSPIRATIONS',
                      payload: { inspirations, mergeMode: 'replace' },
                    } as any)
                  }
                }
                break
              }
              case 'worldDescription': {
                const existingAction = extractedActions.find(
                  a => a.type === 'UPDATE_WORLD_DESCRIPTION'
                )
                const hasValidPayload = existingAction?.payload?.description?.length > 50
                if (!hasValidPayload && messageText.length > 100) {
                  console.log('PremiseArchitect: Using message as world description')
                  extractedActions = extractedActions.filter(
                    a => a.type !== 'UPDATE_WORLD_DESCRIPTION'
                  )
                  extractedActions.push({
                    type: 'UPDATE_WORLD_DESCRIPTION',
                    payload: { description: messageText },
                  } as any)
                }
                break
              }
            }
          }

          parsed = {
            message: extractMessageFromContent(content),
            actions: extractedActions,
            confidence: extractedActions.length > 0 ? 0.8 : 0.5,
            storyPlan: extractedStoryPlan,
          } as any
        }
        actions = (parsed.actions || []) as any
      }
    }

    // ADDITIONAL FALLBACK: If parsed but no actions, try to extract from message content
    // This handles cases where LLM returns valid response but no JSON actions
    if (isSectionUpdate && actions.length === 0 && parsed?.message) {
      console.log(
        `PremiseArchitect: No actions found, attempting text extraction for section: ${section}`
      )
      const messageText = parsed.message

      switch (section) {
        case 'soundtracks': {
          const soundtracks = extractSoundtracksFromText(messageText)
          if (soundtracks.length > 0) {
            console.log(
              `PremiseArchitect: Extracted ${soundtracks.length} soundtracks from message text`
            )
            actions.push({
              type: 'UPDATE_SOUNDTRACKS',
              payload: { soundtracks, mergeMode: 'replace' },
            } as any)
          }
          break
        }
        case 'worldRules': {
          const rules = extractWorldRulesFromText(messageText)
          if (rules.length > 0) {
            console.log(`PremiseArchitect: Extracted ${rules.length} world rules from message text`)
            actions.push({
              type: 'UPDATE_WORLD_RULES',
              payload: { rules, mergeMode: 'smart' },
            } as any)
          }
          break
        }
        case 'factions': {
          const factions = extractFactionsFromText(messageText)
          if (factions.length > 0) {
            console.log(`PremiseArchitect: Extracted ${factions.length} factions from message text`)
            actions.push({
              type: 'UPDATE_FACTIONS',
              payload: { factions, mergeMode: 'smart' },
            } as any)
          }
          break
        }
        case 'keyCharacters': {
          const chars = extractKeyCharactersFromText(messageText)
          if (chars.length > 0) {
            console.log(`PremiseArchitect: Extracted ${chars.length} characters from message text`)
            actions.push({
              type: 'UPDATE_KEY_CHARACTERS',
              payload: { keyCharacters: chars, mergeMode: 'smart' },
            } as any)
          }
          break
        }
        case 'plotTwists': {
          const twists = extractPlotTwistsFromText(messageText)
          if (twists.length > 0) {
            console.log(
              `PremiseArchitect: Extracted ${twists.length} plot twists from message text`
            )
            actions.push({
              type: 'UPDATE_PLOT_TWISTS',
              payload: { plotTwists: twists, mergeMode: 'smart' },
            } as any)
          }
          break
        }
        case 'inspirations': {
          const inspirations = extractInspirationsFromText(messageText)
          if (inspirations) {
            console.log('PremiseArchitect: Extracted inspirations from message text')
            actions.push({
              type: 'UPDATE_INSPIRATIONS',
              payload: { inspirations, mergeMode: 'smart' },
            } as any)
          }
          break
        }
      }
    }

    // Generate user-friendly message for section updates
    // NOTE: These are PROPOSALS awaiting approval, not completed actions
    let messageContent = parsed.message

    // If we have section-specific actions, generate a better proposal message
    if (actions.length > 0 && isSectionUpdate) {
      const actionType = actions[0]?.type
      const payload = actions[0]?.payload as any

      switch (actionType) {
        case 'UPDATE_SOUNDTRACKS':
          const soundtracks = payload?.soundtracks || []
          if (soundtracks.length > 0) {
            messageContent =
              `Here are ${soundtracks.length} soundtrack recommendations for your approval:\n\n` +
              soundtracks
                .map(
                  (s: SoundtrackTrack, i: number) =>
                    `${i + 1}. **"${s.title}"** – ${s.artist}\n   ${s.mood ? `_${s.mood}_` : ''}\n   ${s.youtubeUrl || ''}`
                )
                .join('\n\n')
          }
          break
        case 'UPDATE_WORLD_RULES':
          const rules = payload?.rules || []
          if (rules.length > 0) {
            messageContent =
              `Here are ${rules.length} world rules for your approval:\n\n` +
              rules
                .slice(0, 5)
                .map((r: WorldRule, i: number) => `${i + 1}. **[${r.category}]** ${r.rule}`)
                .join('\n')
          }
          break
        case 'UPDATE_FACTIONS':
          const factions = payload?.factions || []
          if (factions.length > 0) {
            messageContent =
              `Here are ${factions.length} factions for your approval:\n\n` +
              factions
                .slice(0, 5)
                .map((f: Faction, i: number) => `${i + 1}. **${f.name}** – "${f.ideology}"`)
                .join('\n')
          }
          break
        case 'UPDATE_INSPIRATIONS':
          messageContent = 'Here are updated reference materials for your approval.'
          break
        case 'UPDATE_WORLD_DESCRIPTION':
          messageContent = 'Here is an updated atmospheric description for your approval.'
          break
        case 'UPDATE_KEY_CHARACTERS':
          const chars = payload?.keyCharacters || []
          if (chars.length > 0) {
            messageContent =
              `Here are ${chars.length} key characters for your approval:\n\n` +
              chars
                .slice(0, 5)
                .map((c: KeyCharacter, i: number) => `${i + 1}. **${c.name}** (${c.role}) – ${c.archetype}`)
                .join('\n')
          }
          break
        case 'UPDATE_PLOT_TWISTS':
          const twists = payload?.plotTwists || []
          if (twists.length > 0) {
            messageContent = `Here are ${twists.length} plot twists for your approval.`
          }
          break
        case 'UPDATE_EPISODE_ROADMAP':
          messageContent =
            'Here is an updated season structure and episode breakdown for your approval.'
          break
        default:
          // Keep the original message
          break
      }
    }

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
      ; (namedMessage as any).actions = actions
      ; (namedMessage as any).confidence = confidence

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
        ; (namedMessage as any).actions = actions
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
