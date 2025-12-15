import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, SystemMessage, HumanMessage } from '@langchain/core/messages'
import { v4 as uuidv4 } from 'uuid'
import { WritersRoomState } from '../graph/state'
import { AgentResponse, AgentAction, AgentQuestion, AGENT_RESPONSE_SCHEMA } from '../actions/types'
import { assembleContext } from '../context/assembler'


// ============================================
// MODEL CONFIGURATION
// ============================================

// Primary model for complex reasoning (GPT-4o)
export const primaryModel = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0.7,
  maxRetries: 3,
})

// Fast model for simple tasks (GPT-4o-mini)
export const fastModel = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.5,
  maxRetries: 2,
})


// ============================================
// BASE AGENT - Common functionality for all agents
// ============================================

export interface AgentConfig {
  name: string
  role: string
  model: ChatOpenAI
  systemPromptTemplate: string
  canAskQuestions: boolean
  canCommitActions: boolean
  actionTypes?: string[] // Which action types this agent can commit
}

export abstract class BaseAgent {
  protected config: AgentConfig

  constructor(config: AgentConfig) {
    this.config = config
  }

  /**
   * Main invoke method - processes state and returns updates
   */
  async invoke(state: WritersRoomState): Promise<Partial<WritersRoomState>> {
    console.log(`${this.config.name} processing...`)

    try {
      // Assemble context
      const context = assembleContext(state, this.config.name.toLowerCase())

      // Build messages
      const messages = this.buildMessages(state, context)

      // Get structured response from LLM
      const response = await this.getStructuredResponse(messages)

      // Create the AI message
      const aiMessage = new AIMessage({
        content: response.message,
        name: this.config.name,
      })

      // Build state update
      const stateUpdate: Partial<WritersRoomState> = {
        messages: [aiMessage],
      }

      // Check if there are blocking questions
      const hasBlockingQuestion = response.questions?.some(q => q.urgency === 'blocking')
      if (hasBlockingQuestion) {
        stateUpdate.awaitingUserInput = true
      }

      return stateUpdate
    } catch (error) {
      console.error(`${this.config.name} error:`, error)
      return this.handleError(error)
    }
  }

  /**
   * Build messages for LLM
   */
  protected buildMessages(
    state: WritersRoomState,
    context: { systemPrompt: string; stateContext: string }
  ) {
    const structuredOutputInstruction = this.getStructuredOutputInstruction()

    // Combine system content into single message (required for Claude)
    const combinedSystem = [context.systemPrompt, context.stateContext, structuredOutputInstruction].join('\n\n---\n\n')
    const conversationMessages = state.messages.slice(-6).filter(m => m._getType() !== 'system')

    return [
      new SystemMessage(combinedSystem),
      ...conversationMessages,
    ]
  }

  /**
   * Get instruction for structured output
   */
  protected getStructuredOutputInstruction(): string {
    const allowedActions = this.config.actionTypes?.length
      ? `You can only commit these action types: ${this.config.actionTypes.join(', ')}`
      : 'You cannot commit any actions directly.'

    const questionInstruction = this.config.canAskQuestions
      ? 'You CAN ask the user questions when you need clarification or input.'
      : 'You should NOT ask questions - provide your best assessment.'

    return `
## RESPONSE FORMAT

You MUST respond with a valid JSON object in the following format:

{
    "message": "Your response to the user/room (required)",
    "thinking": "Your reasoning process (optional, for transparency)",
    "actions": [
        // Array of actions to commit (can be empty)
        // ${allowedActions}
    ],
    "questions": [
        // Array of questions for the user (can be empty)
        // ${questionInstruction}
    ],
    "confidence": 0.85, // Your confidence level 0-1 (required)
    "nextAgent": "PlotArchitect" // Suggest next agent (optional)
}

### Action Format:
{
    "type": "ACTION_TYPE",
    "payload": { /* action-specific data */ }
}

### Question Format:
{
    "id": "unique-id",
    "agentName": "${this.config.name}",
    "question": "Your question",
    "questionType": "single_choice", // or "multiple_choice", "free_text", "confirmation"
    "options": [
        { "id": "opt1", "label": "Option 1", "description": "Details", "consequence": "What happens", "recommended": true }
    ],
    "context": "Why you're asking",
    "urgency": "blocking" // or "important", "optional"
}

IMPORTANT: 
- Respond ONLY with the JSON object, no additional text
- Always include "message", "actions" (can be []), and "confidence"
- Be specific in your message - explain your reasoning
- When asking questions, provide clear options with consequences
`
  }

  /**
   * Get structured response from LLM
   */
  protected async getStructuredResponse(messages: any[]): Promise<AgentResponse> {
    const response = await this.config.model.invoke(messages)
    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

    // Try to parse as JSON
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = content
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim()
      }

      const parsed = JSON.parse(jsonStr) as AgentResponse

      // Ensure required fields
      return {
        message: parsed.message || content,
        thinking: parsed.thinking,
        actions: parsed.actions || [],
        questions: this.processQuestions(parsed.questions || []),
        confidence: parsed.confidence ?? 0.7,
        nextAgent: parsed.nextAgent,
      }
    } catch (e) {
      // If parsing fails, return plain message
      console.warn(`${this.config.name}: Failed to parse structured response, using plain text`)
      return {
        message: content,
        actions: [],
        confidence: 0.5,
      }
    }
  }

  /**
   * Process questions to ensure they have IDs
   */
  protected processQuestions(questions: AgentQuestion[]): AgentQuestion[] {
    return questions.map(q => ({
      ...q,
      id: q.id || uuidv4(),
      agentName: this.config.name,
    }))
  }

  /**
   * Handle errors gracefully
   */
  protected handleError(error: any): Partial<WritersRoomState> {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    const isAPIError =
      errorMsg.includes('403') || errorMsg.includes('401') || errorMsg.includes('Forbidden')

    const message = isAPIError
      ? `⚠️ **API Error**: Unable to connect to AI service. Please check your OPENAI_API_KEY.\n\nError: ${errorMsg}`
      : `⚠️ **Error**: ${errorMsg}\n\nI'll pause here. Please review and try again.`

    return {
      messages: [new AIMessage({ content: message, name: this.config.name })],
      shouldTerminate: true,
    }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a standard question with common options
 */
export function createChoiceQuestion(
  agentName: string,
  question: string,
  options: Array<{
    label: string
    description?: string
    consequence?: string
    recommended?: boolean
  }>,
  urgency: 'blocking' | 'important' | 'optional' = 'important',
  context?: string
): AgentQuestion {
  return {
    id: uuidv4(),
    agentName,
    question,
    questionType: 'single_choice',
    options: options.map((opt, idx) => ({
      id: `opt_${idx}`,
      ...opt,
    })),
    urgency,
    context,
  }
}

/**
 * Create a confirmation question
 */
export function createConfirmationQuestion(
  agentName: string,
  question: string,
  urgency: 'blocking' | 'important' | 'optional' = 'blocking'
): AgentQuestion {
  return {
    id: uuidv4(),
    agentName,
    question,
    questionType: 'confirmation',
    options: [
      { id: 'yes', label: 'Yes', recommended: true },
      { id: 'no', label: 'No' },
    ],
    urgency,
  }
}
