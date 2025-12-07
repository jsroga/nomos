/**
 * Premise Architect Agent
 *
 * Generates the "World Bible" and "Initial Conflicts" (The Gardener Approach).
 * Instead of a rigid 8-sequence structure, this builds the soil (World),
 * plants the seeds (Factions/Characters), and watches them grow (Inciting Incident).
 */

import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { WritersRoomState } from '../graph/state'
import { getModel } from '../config/model-config'
import { AgentAction } from '../actions/types'
import {
  PremiseArchitectResponseSchema,
  PremiseArchitectResponse,
  parseAgentResponse,
  StoryPlanSchema,
} from '../schemas/agent-schemas'

import { getSafeMessageHistory } from '../utils/message-utils'

// Model is created inside the function to use request-scoped config (AsyncLocalStorage)

const PREMISE_ARCHITECT_PROMPT = `
## YOU ARE THE WORLD & CONFLICT ARCHITECT

Your job is NOT to write a screenplay. Your job is to build a volatile ecosystem aka the "World Bible".
We follow the "Gardener" philosophy (George R.R. Martin, Vince Gilligan):
**"Create characters and a world so distinct that the story writes itself through their collisions."**

## STEP 1: THE RULES OF PLAY (World Building)
Define the hard constraints. Magic, physics, politics, technology.
Rules create conflict. "Magic has a terrible cost" is better than "Magic can do anything".

## STEP 2: THE PLAYERS (Factions & Characters)
Create opposing forces. NOT just "Good vs Evil".
Create factions with incompatible goals.
- Faction A wants X.
- Faction B wants Y.
- X and Y cannot coexist.
- The Protagonist is caught in the middle.

## STEP 3: THE SPARK (Inciting Incident)
What disrupts the equilibrium? A death? An invention? A betrayal?
How do the factions react?

## STEP 4: PLOT TWISTS & ROADMAP
- **Plot Twists**: Provide exactly 3 major plot twists that completely recontextualize the story.
- **Episode Breakdown**: Define the arc of the season. 
  - IF the number is known (or you decide to propose, e.g. 8-10), generate a 1-2 sentence summary for each episode in the \`sequences\` field.

## FULL BIBLE GENERATION
If the user asks for a "Whole Bible", "Full World", or "Create World", you MUST populate ALL fields in the \`storyPlan\` object.
Do not leave fields empty. Invent details if they are missing.
- worldDescription (Visuals, sensory details)
- worldRules (Magic, technology, society)
- factions (At least 2 conflicting factions)
- keyCharacters (Protagonist, Antagonist, Supporting)
- plotTwists (3 major twists)
- sequences (Episode breakdown - assume 8-10 episodes if not specified)
- tone, genre, themes, inspirations

## YOUR RESPONSE FORMAT
Respond with a JSON object containing the complete story plan:

{
    "message": "Explain the core conflict and why this world is a powder keg.",
    "actions": [
        {
            "type": "UPDATE_SERIES_BIBLE",
            "payload": {
                "storyPlan": {
                    "title": "Working title",
                    "worldDescription": "A vivid, atmospheric description of the world. Sensory details. The look and feel.",
                    "inspirations": {
                        "books": ["Book 1", "Book 2"],
                        "movies": ["Movie 1"],
                        "games": ["Game 1"]
                    },
                    "moodSoundtrack": "Link to a song or description of the musical vibe (e.g. 'Industrial synthwave mixed with gregorian chants')",
                    "imagePrompts": {
                        "world": "A prompt describing a wide shot of the world setting. High fidelity, cinematic lighting, 8k.",
                        "scene1": "A prompt describing a key character moment or close-up detail.",
                        "scene2": "A prompt describing a faction conflict or dynamic action shot."
                    },
                    "genre": "Genre",
                    "tone": "Tone",
                    "centralQuestion": "Thematic question",
                    "worldRules": [
                        { "category": "Magic", "rule": "Magic consumes memories", "consequence": "Users eventually forget why they are fighting" }
                    ],
                    "plotTwists": [
                        "The protagonist is actually a ghost.",
                        "The Iron Bank is run by an AI.",
                        "The war ended 100 years ago, this is a simulation."
                    ],
                    "factions": [
                        { "id": "f1", "name": "The Iron Bank", "ideology": "Gold rules all", "goals": ["Control trade"], "resources": "Infinite wealth" }
                    ],
                    "keyCharacters": [
                         { "name": "Protagonist", "role": "Protagonist", "archetype": "The Reluctant King", "motivation": "Survival", "factionId": "f1" }
                    ],
                    "sequences": [
                        {
                            "id": 1,
                            "name": "The Inciting Incident",
                            "description": "The Spark that lights the fire.",
                            "keyFactionsInvolved": ["The Iron Bank"],
                            "worldConsequence": "War is declared."
                        },
                         {
                            "id": 2,
                            "name": "The Reaction",
                            "description": "How the factions move their pieces.",
                            "keyFactionsInvolved": ["The Iron Bank", "The Rebels"],
                            "worldConsequence": "Martial law is declared."
                        }
                    ],
                    "themes": ["Greed", "Memory"]
                }
            }
        }
    ],
    "confidence": 0.9
}

## CRITICAL REQUIREMENTS
1. **NO GENERIC TROPES** - Be weird. Be specific.
2. **LOGIC IS KING** - People act in their self-interest.
3. **CONSEQUENCES** - Every action by a faction must have a reaction.
4. **MORAL GREY** - No clear good guys. Everyone is the hero of their own story.
`

export const premiseArchitectAgent = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  // Create model inside function to use request-scoped config
  const model = getModel('premiseArchitect')
  
  console.log('Premise Architect generating World & Conflict Bible...')

  // Build context from user input and any existing bible
  const existingBible = state.seriesBible || {}
  const masterPrompt = existingBible.masterPrompt || ''

  const contextMessage = `
## PROJECT CONTEXT

${masterPrompt ? `**Master Prompt (Project Style):**\n${masterPrompt}\n` : ''}

${existingBible.genre ? `**Established Genre:** ${existingBible.genre}` : ''}
${existingBible.tone ? `**Established Tone:** ${existingBible.tone}` : ''}
${existingBible.themes ? `**Established Themes:** ${existingBible.themes.join(', ')}` : ''}

## USER'S STORY IDEA
Based on the conversation, create the World Bible and Initial Conflict.
`

  // Combine system content into single message (required for Claude)
  const combinedSystem = [PREMISE_ARCHITECT_PROMPT, contextMessage].join('\n\n---\n\n')
  const conversationMessages = getSafeMessageHistory(state.messages, 5).filter(m => m._getType() !== 'system')
  
  const messages = [
    new SystemMessage(combinedSystem),
    ...conversationMessages,
  ]

  try {
    // Try structured output first
    let parsed: PremiseArchitectResponse | null = null
    let actions: AgentAction[] = []

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
      const fallbackMessages = getSafeMessageHistory(state.messages, 5).filter(m => m._getType() !== 'system')
      const response = await model.invoke([
        new SystemMessage(combinedSystem),
        ...fallbackMessages
      ])
      const content =
        typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
      parsed = parseAgentResponse(content, PremiseArchitectResponseSchema)

      if (!parsed) {
        parsed = {
          message: content,
          actions: [],
          confidence: 0.5,
        }
      }
      actions = (parsed.actions || []) as any
    }

    const messageContent = parsed.message
    const confidence = parsed.confidence ?? 0.8

    const namedMessage = new AIMessage({
      content: messageContent,
      name: 'PremiseArchitect',
    })

      // Attach actions for UI and execution
      ; (namedMessage as any).actions = actions
      ; (namedMessage as any).confidence = confidence

    // Extract story plan from actions if present
    let storyPlan = null
    const bibleAction = actions.find(a => a.type === 'UPDATE_SERIES_BIBLE')
    if (bibleAction?.payload?.storyPlan) {
      storyPlan = bibleAction.payload.storyPlan
    }

    // SMART TERMINATION: Pause after generating premise for user review
    console.log('PremiseArchitect: World & Conflict generated - pausing for user review')

    return {
      messages: [namedMessage],
      seriesBible: storyPlan
        ? {
          ...state.seriesBible,
          storyPlan,
          genre: storyPlan.genre,
          tone: storyPlan.tone,
          themes: storyPlan.themes,
          // Store the new heavy objects in the bible for other agents to see
          worldRules: storyPlan.worldRules,
          factions: storyPlan.factions,
          keyCharacters: storyPlan.keyCharacters
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

