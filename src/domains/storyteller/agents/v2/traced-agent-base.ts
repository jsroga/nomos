/**
 * TracedAgentBase - Base class for agents with Langfuse observability
 *
 * Provides automatic tracing for all agent operations:
 * - Creates child traces for each agent
 * - Records thinking/reasoning
 * - Tracks generations with proper context
 */

import { Agent } from '@mastra/core/agent'
import { v4 as uuidv4 } from 'uuid'
import {
    langfuse,
    createAgentTrace,
    recordAgentGeneration,
    recordAgentThinking,
    withSpan,
} from '../../../../agent-core/observability'
import { getWorkflowTraceId, getWorkflowSessionId, getWorkflowUserId } from '../../utils/workflow-context'

export interface TracedAgentConfig {
    name: string
    modelName?: string
    traceId?: string
    projectId?: string
    episodeId?: string
    userId?: string
    sessionId?: string
}

export interface TracedGenerateOptions {
    traceId?: string
    metadata?: Record<string, any>
}

/**
 * Base class for traced agents
 *
 * Usage:
 * ```typescript
 * class MyAgent extends TracedAgentBase {
 *   constructor(config: TracedAgentConfig) {
 *     super(config)
 *     this.agent = new Agent({ ... })
 *   }
 * }
 * ```
 */
export abstract class TracedAgentBase {
    protected agent!: Agent
    protected config: TracedAgentConfig
    protected currentTraceId: string

    constructor(config: TracedAgentConfig) {
        this.config = {
            ...config,
            // Inherit sessionId and userId from workflow context if not explicitly provided
            sessionId: config.sessionId || getWorkflowSessionId(),
            userId: config.userId || getWorkflowUserId(),
        }
        // Try to get traceId from: explicit config > workflow context > new UUID
        this.currentTraceId = config.traceId || getWorkflowTraceId() || uuidv4()
    }

    /**
     * Get the current trace ID for this agent
     */
    getTraceId(): string {
        return this.currentTraceId
    }

    /**
     * Set a new trace ID (for child operations)
     */
    setTraceId(traceId: string): void {
        this.currentTraceId = traceId
    }

    /**
     * Create a child trace for this agent's operations
     */
    protected createTrace(): ReturnType<typeof createAgentTrace> {
        return createAgentTrace({
            traceId: this.currentTraceId,
            agentName: this.config.name,
            projectId: this.config.projectId,
            episodeId: this.config.episodeId,
            userId: this.config.userId,
            sessionId: this.config.sessionId
        })
    }

    /**
     * Generate with automatic tracing
     */
    protected async tracedGenerate(
        prompt: string,
        context?: string,
        options?: TracedGenerateOptions
    ): Promise<{ text: string; thinking?: string }> {
        const traceId = options?.traceId || this.currentTraceId
        const agentName = this.config.name

        return withSpan(traceId, `${agentName}.generate`, async (span) => {
            // Create a dedicated trace for this agent if it's a child
            const trace = this.createTrace()

            try {
                const response = await this.agent.generate(prompt)
                const text = response.text
                const thinking = (response as any).reasoning || (response as any).thinking

                // Record the generation in Langfuse
                recordAgentGeneration(
                    traceId,
                    agentName,
                    { prompt, context },
                    { text, thinking },
                    {
                        model: this.config.modelName || 'gpt-4o',
                        tokens: (response as any).usage?.totalTokens
                    }
                )

                // Record thinking if present
                if (thinking) {
                    recordAgentThinking(traceId, agentName, thinking)
                }

                return { text, thinking }
            } catch (error: any) {
                span.end({
                    output: error,
                    level: 'ERROR',
                    statusMessage: error.message
                })
                throw error
            }
        }, { prompt: prompt.slice(0, 200), ...options?.metadata })
    }

    /**
     * Stream with automatic tracing
     */
    protected async tracedStream(
        prompt: string,
        options?: {
            traceId?: string
            onThinking?: (thinking: string) => void
            onToken?: (token: string) => void
        }
    ) {
        const traceId = options?.traceId || this.currentTraceId
        const agentName = this.config.name

        // Create trace for this agent
        const trace = this.createTrace()

        // Create a span for the stream operation
        const span = langfuse.span({
            traceId,
            name: `${agentName}.stream`,
            input: { prompt: prompt.slice(0, 500) }
        })

        try {
            const result = await this.agent.stream(prompt, {
                telemetry: {
                    isEnabled: true,
                    metadata: {
                        agentName,
                        traceId,
                        projectId: this.config.projectId,
                        episodeId: this.config.episodeId
                    }
                }
            } as any)

            let fullText = ''
            let thinkingText = ''

            // Process the stream
            for await (const chunk of result.fullStream) {
                if (chunk.type === 'text-delta') {
                    const text = (chunk as any).textDelta || ''
                    fullText += text
                    options?.onToken?.(text)
                } else if ((chunk as any).type === 'reasoning' || (chunk as any).type === 'thinking') {
                    const thinking = (chunk as any).text || (chunk as any).thinking || ''
                    thinkingText += thinking
                    options?.onThinking?.(thinking)
                }
            }

            // Record thinking if captured
            if (thinkingText) {
                recordAgentThinking(traceId, agentName, thinkingText)
            }

            // End span with output
            span.end({ output: { text: fullText.slice(0, 1000), hasThinking: !!thinkingText } })

            return { text: fullText, thinking: thinkingText }
        } catch (error: any) {
            span.end({
                output: error,
                level: 'ERROR',
                statusMessage: error.message
            })
            throw error
        }
    }

    /**
     * Execute a method with tracing span
     */
    protected async withTrace<T>(
        operationName: string,
        fn: () => Promise<T>,
        metadata?: Record<string, any>
    ): Promise<T> {
        return withSpan(
            this.currentTraceId,
            `${this.config.name}.${operationName}`,
            async () => fn(),
            undefined,
            metadata
        )
    }
}

/**
 * Helper to create a traced agent with proper context
 */
export function createTracedAgentContext(
    parentTraceId?: string,
    config?: Partial<TracedAgentConfig>
): TracedAgentConfig {
    return {
        name: config?.name || 'Agent',
        traceId: parentTraceId || getWorkflowTraceId() || uuidv4(),
        projectId: config?.projectId,
        episodeId: config?.episodeId,
        userId: config?.userId,
        sessionId: config?.sessionId,
        modelName: config?.modelName
    }
}
