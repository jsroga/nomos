import { buildAgentContext } from '../utils/context-builder'
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
import { EPISODE_PREMISE_PROMPT } from '../prompts/agents/episode-premise'
import { loadPromptCached } from '../prompts/hub-loader'

export const episodePremiseArchitectAgent = async (
    state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
    // Create model inside function to use request-scoped config
    const model = getModel('premiseArchitect')

    console.log('Episode Premise Architect generating premise...')

    // Load prompt from Hub
    const loadedPrompt = await loadPromptCached('episodePremiseArchitect')
    const promptMessages = (loadedPrompt.prompt as any).promptMessages || (loadedPrompt.prompt as any).messages || []
    const systemMessage = promptMessages.find((m: any) => m.lc_id?.[3] === 'SystemMessagePromptTemplate' || m._type === 'system')
    const systemTemplate = systemMessage?.prompt?.template || systemMessage?.template || EPISODE_PREMISE_PROMPT

    const contextMessage = buildAgentContext(state, 'premise')

    // Combine system content into single message (required for Claude)
    const combinedSystem = [systemTemplate, contextMessage].join('\n\n---\n\n')
    const conversationMessages = getSafeMessageHistory(state.messages, 10).filter(m => m._getType() !== 'system')

    const messages = [
        new SystemMessage(combinedSystem),
        ...conversationMessages,
    ]

    try {
        let parsed: EpisodePremiseArchitectResponse | null = null
        let actions: AgentAction[] = []

        // Retry structured output with backoff before falling back
        const MAX_RETRIES = 3
        let lastError: Error | null = null

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const structuredModel = model.withStructuredOutput(EpisodePremiseArchitectResponseSchema)
                parsed = (await structuredModel.invoke(messages)) as EpisodePremiseArchitectResponse
                actions = (parsed.actions || []) as AgentAction[]
                break // Success - exit retry loop
            } catch (structuredError) {
                lastError = structuredError as Error
                console.warn(`Episode Premise Architect: Attempt ${attempt}/${MAX_RETRIES} failed:`, structuredError)

                if (attempt < MAX_RETRIES) {
                    // Exponential backoff: 500ms, 1000ms, 2000ms
                    const delay = 500 * Math.pow(2, attempt - 1)
                    await new Promise(resolve => setTimeout(resolve, delay))
                }
            }
        }

        // Final fallback: try raw invoke + manual parsing
        if (!parsed) {
            console.warn('Episode Premise Architect: All structured attempts failed, attempting raw parse...')
            try {
                const response = await model.invoke(messages)
                const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
                parsed = parseAgentResponse(content, EpisodePremiseArchitectResponseSchema)

                if (parsed) {
                    actions = (parsed.actions || []) as AgentAction[]
                } else {
                    console.warn('❌ PREMISE: Full schema parse failed, attempting targeted extraction...')

                    // Try to extract just the episodePremise object from the content
                    let extractedPremise: EpisodePremiseArchitectResponse['episodePremise'] = null
                    try {
                        // Look for JSON in the content
                        const jsonMatch = content.match(/\{[\s\S]*\}/)
                        if (jsonMatch) {
                            const jsonContent = jsonMatch[0]
                            const fullObj = JSON.parse(jsonContent)

                            // Check if it's the full response or just episodePremise
                            if (fullObj.episodePremise) {
                                extractedPremise = fullObj.episodePremise
                                console.log('✅ PREMISE: Extracted from nested episodePremise')
                            } else {
                                // Check if it looks like a partial premise (has at least one focused key)
                                const premiseKeys = [
                                    'title', 'logline', 'theHook', 'theTurn', 'theAftermath',
                                    'protagonistHook', 'fatalFlaw', 'stakes', 'transformation',
                                    'inevitableConsequence', 'thematicFocus'
                                ];

                                const hasPremiseKey = premiseKeys.some(key => key in fullObj);

                                if (hasPremiseKey) {
                                    extractedPremise = fullObj
                                    console.log('✅ PREMISE: Extracted direct partial premise')
                                }
                            }
                        }
                    } catch (extractError) {
                        console.warn('Targeted episodePremise extraction failed:', extractError)
                    }

                    parsed = {
                        message: extractedPremise
                            ? "I've updated the episode premise based on your request."
                            : content, // Keep content if extraction failed so user sees what happened
                        actions: [],
                        confidence: extractedPremise ? 0.6 : 0.3,
                        episodePremise: extractedPremise
                    }
                }
            } catch (rawError) {
                console.error('❌ PREMISE: Raw invoke also failed:', rawError)
                throw lastError || rawError
            }
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
