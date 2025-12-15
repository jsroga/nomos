
import { Runnable, RunnableConfig } from '@langchain/core/runnables'
import { BaseMessage, AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { AgentAction } from '../actions/types'
import { WritersRoomState } from '../graph/state'
import { GuardrailIssue } from './types'

// ============================================
// VALIDATOR INTERFACES
// ============================================

export interface ValidationResult {
    isValid: boolean
    issues: GuardrailIssue[]
    // Optional: A corrected value if the validator can fix it
    repairedValue?: any
}

/**
 * A standard interface for any guardrail check.
 * T is the input type (e.g., string for input guards, Partial<State> for output guards)
 */
export interface Validator<T> {
    name: string
    validate(input: T, context?: any): Promise<ValidationResult>
}

// ============================================
// RUNNABLE GUARD
// ============================================

export interface RunnableGuardInput<RunInput, RunOutput> {
    agent: Runnable<RunInput, RunOutput>
    inputValidators?: Validator<RunInput>[]
    outputValidators?: Validator<RunOutput>[]
    maxRetries?: number
    agentRole?: string
}

/**
 * A Guard that wraps an Agent (Runnable).
 * It intercepts input/output and implements a "Self-Correction" loop.
 */
export class RunnableGuard<RunInput extends { messages?: BaseMessage[] }, RunOutput extends { messages?: BaseMessage[] }>
    extends Runnable<RunInput, RunOutput> {

    protected agent: Runnable<RunInput, RunOutput>
    protected inputValidators: Validator<RunInput>[]
    protected outputValidators: Validator<RunOutput>[]
    protected maxRetries: number
    protected agentRole: string

    constructor(config: RunnableGuardInput<RunInput, RunOutput>) {
        super(config)
        this.agent = config.agent
        this.inputValidators = config.inputValidators || []
        this.outputValidators = config.outputValidators || []
        this.maxRetries = config.maxRetries ?? 3
        this.agentRole = config.agentRole || 'agent'
    }

    async invoke(input: RunInput, config?: RunnableConfig): Promise<RunOutput> {
        // 1. INPUT VALIDATION
        // We run these in parallel
        const inputResults = await Promise.all(
            this.inputValidators.map(v => v.validate(input))
        )

        const inputIssues = inputResults.flatMap(r => r.issues)
        const inputBlocking = inputIssues.filter(i => i.severity === 'error')

        if (inputBlocking.length > 0) {
            console.warn(`[RunnableGuard] Input blocked for ${this.agentRole}:`, inputBlocking.map(i => i.message))
            // We can't easily return a "RunOutput" here because we don't know its shape fully,
            // but we can throw or return a mock if possible. 
            // For now, let's assume we throw or return a special error message if the output type allows.
            throw new Error(`Input blocked: ${inputBlocking[0].message}`)
        }

        // 2. AGENT EXECUTION LOOP (With Self-Correction)
        let currentInput = input
        let retries = 0

        while (retries <= this.maxRetries) {
            // Execute Agent
            const result = await this.agent.invoke(currentInput, config)

            // 3. OUTPUT VALIDATION
            const outputResults = await Promise.all(
                this.outputValidators.map(v => v.validate(result, { state: currentInput }))
                // Note: we pass original input as context (e.g. for state aware checks)
            )

            const outputIssues = outputResults.flatMap(r => r.issues)
            const outputBlocking = outputIssues.filter(i => i.severity === 'error')

            // IF VALID (No blocking errors)
            if (outputBlocking.length === 0) {
                // We might want to attach warnings to the result if the state supports it
                return result
            }

            // IF INVALID
            console.warn(`[RunnableGuard] Output validation failed for ${this.agentRole} (Attempt ${retries + 1}/${this.maxRetries + 1})`)
            console.warn(`Issues:`, outputBlocking.map(i => i.message))

            retries++
            if (retries > this.maxRetries) {
                console.error(`[RunnableGuard] Max retries exceeded for ${this.agentRole}. Returning unsafe/partial result or error.`)
                // Option: Return result anyway but tagged? Or throw?
                // For stability, we might just return the last result but log heavily.
                // Or strictly, throw. Let's throw to stop bad state propagation.
                throw new Error(`Guardrail Validation Failed after ${retries} attempts: ${outputBlocking[0].message}`)
            }

            // SELF-CORRECTION
            // We need to construct a new input that includes a system message telling the agent to fix it.
            // This "mutation" of input depends on the shape of RunInput.
            // We assume RunInput has a `messages` array (standard for Chat runnables).
            if (currentInput && typeof currentInput === 'object' && 'messages' in currentInput && Array.isArray((currentInput as any).messages)) {
                const adjustmentMessage = new HumanMessage({
                    content: `SYSTEM_ALERT: Your last response was blocked by safety guardrails.\n\nIssues:\n${outputBlocking.map(i => `- ${i.message}`).join('\n')}\n\nPlease fix these issues and try again.`
                })

                // We append the bad response (so it knows what it did) and the correction request
                // NOTE: Depending on how the runnable handles state, we might need to be careful not to duplicate state.
                // But typically, `invoke` takes the current state.
                // We append to the messages.
                const prevMessages = (currentInput as any).messages

                // We need the ACTUAL bad response message from `result`.
                // We assume RunOutput also has `messages`.
                const badResponseMessages: BaseMessage[] = (result as any).messages || []
                const badResponse = badResponseMessages[badResponseMessages.length - 1]

                const newMessages = [...prevMessages]
                if (badResponse) newMessages.push(badResponse)
                newMessages.push(adjustmentMessage)

                currentInput = {
                    ...currentInput,
                    messages: newMessages
                }
            } else {
                // Can't self-correct if we can't modify messages
                throw new Error(`Guardrail failed and cannot self-correct (input missing 'messages'): ${outputBlocking[0].message}`)
            }
        }

        throw new Error("Unexpected end of retry loop")
    }

    // Helper for batch/stream if needed (omitted for brevity, default Runnable impl handles some)
    async batch(inputs: RunInput[], options?: any): Promise<RunOutput[]> {
        return Promise.all(inputs.map(i => this.invoke(i, options)))
    }

    async stream(input: RunInput, options?: any) {
        return this.agent.stream(input, options)
    }
}
