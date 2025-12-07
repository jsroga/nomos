/**
 * Episode Premise Architect Agent
 *
 * Specializes in generating high-stakes, transformative episode premises
 * following the "Ozymandias Framework".
 */

import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { WritersRoomState } from '../graph/state'
import { getModel } from '../config/model-config'
import { AgentAction } from '../actions/types'
import { getSafeMessageHistory } from '../utils/message-utils'
import {
    EpisodePremiseArchitectResponseSchema,
    EpisodePremiseArchitectResponse,
    parseAgentResponse,
} from '../schemas/agent-schemas'

// Model is created inside the function to use request-scoped config (AsyncLocalStorage)

const EPISODE_PREMISE_PROMPT = `
## YOU ARE THE EPISODE ARCHITECT (OZYMANDIAS FRAMEWORK)

Your goal is to construct an episode premise that feels inevitable yet surprising. 
We strictly follow the "Ozymandias" framework for high-impact storytelling.

## THE OZYMANDIAS FRAMEWORK
A perfect episode premise consists of:
1. **THE HOOK**: An opening image or situation that immediately grabs attention and poses a question.
2. **THE FLAW**: The protagonist's central character flaw that drives the plot.
3. **THE TURN**: A midpoint or key event where the flaw causes a critical error or revelation.
4. **THE INEVITABILITY**: The climax is a direct result of the choices made.
5. **THE AFTERMATH**: The world or character is irreversibly changed.

## INSTRUCTIONS
- **Focus on CONFLICT**: Every scene must have conflict.
- **Focus on CHANGE**: Something must change permanently by the end.
- **Avoid Filler**: Every beat must advance the plot or character arc.

## YOUR RESPONSE FORMAT
Respond with a JSON object containing the episode premise:

{
    "message": "A brief explanation of why this premise works.",
    "episodePremise": {
        "title": "Episode Title",
        "logline": "A single sentence summary.",
        "theHook": "Visual description of the opening.",
        "theTurn": "The turning point description.",
        "theAftermath": "The consequence/change.",
        "thematicFocus": "The central theme (e.g. Hubris)",
        "charactersInvolved": ["Char A", "Char B"]
    },
    "actions": [],
    "confidence": 0.95
}
`

export const episodePremiseArchitectAgent = async (
    state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
    // Create model inside function to use request-scoped config
    const model = getModel('premiseArchitect')

    console.log('Episode Premise Architect generating premise...')

    const bible = state.seriesBible || {}
    const characters = bible.keyCharacters || []
    const contextMessage = `
## WORLD CONTEXT (SERIES BIBLE)
Title: ${bible.title}
Logline: ${bible.logline}
Genre: ${bible.genre}
Theme: ${bible.centralTheme}

## KEY CHARACTERS
${characters
            .map(c => `- ${c.name} (${c.role}): ${c.motivation}. Flaw: ${c.archetype}`)
            .join('\n')}

## CURRENT SITUATION
Evaluate the chat history to understand what kind of episode the user wants to create.
`

    // Combine system content into single message (required for Claude)
    const combinedSystem = [EPISODE_PREMISE_PROMPT, contextMessage].join('\n\n---\n\n')
    const conversationMessages = getSafeMessageHistory(state.messages, 10).filter(m => m._getType() !== 'system')

    const messages = [
        new SystemMessage(combinedSystem),
        ...conversationMessages,
    ]

    try {
        let parsed: EpisodePremiseArchitectResponse | null = null
        let actions: AgentAction[] = []

        try {
            const structuredModel = model.withStructuredOutput(EpisodePremiseArchitectResponseSchema)
            parsed = (await structuredModel.invoke(messages)) as EpisodePremiseArchitectResponse
            actions = (parsed.actions || []) as AgentAction[]
        } catch (structuredError) {
            console.warn('Episode Premise Architect: Structured output failed, fallback...', structuredError)
            const response = await model.invoke(messages)
            const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
            parsed = parseAgentResponse(content, EpisodePremiseArchitectResponseSchema)

            if (!parsed) {
                parsed = {
                    message: content,
                    actions: [],
                    confidence: 0.5
                }
            }
            actions = (parsed.actions || []) as AgentAction[]
        }

        const messageContent = parsed.message
        const confidence = parsed.confidence ?? 0.8
        const episodePremise = parsed.episodePremise

        const namedMessage = new AIMessage({
            content: messageContent,
            name: 'EpisodeArchitect'
        })

            // Attach metadata
            ; (namedMessage as any).actions = actions
            ; (namedMessage as any).confidence = confidence
            ; (namedMessage as any).episodePremise = episodePremise

        // Inject persistence action if premise exists
        if (episodePremise) {
            const updateAction: AgentAction = {
                type: 'UPDATE_EPISODE_PREMISE',
                payload: {
                    premise: episodePremise
                }
            }
            // Prepend to ensure it runs
            actions.unshift(updateAction)
                ; (namedMessage as any).actions = actions
        }

        console.log('Episode Premise Generated:', episodePremise?.title)

        return {
            messages: [namedMessage],
            // specialized state can be added here if needed, or just passed via message metadata for UI to pick up
            awaitingUserInput: true // Pause for approval
        }

    } catch (error) {
        console.error('Episode Premise Architect error:', error)
        return {
            messages: [new AIMessage({ content: 'Error generating episode premise.', name: 'EpisodeArchitect' })]
        }
    }
}
