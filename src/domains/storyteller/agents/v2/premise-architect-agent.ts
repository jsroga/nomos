/**
 * Premise Architect Agent - Mazur Framework Implementation
 *
 * Dedicated agent for generating high-stakes episode premises
 * following the Ozymandias Framework with Mazur self-improvement loop.
 *
 * Features:
 * - Mazur Framework judging (GRRM/Gilligan/Lynch)
 * - Self-improvement loop up to N=20 iterations
 * - Full Langfuse visibility
 * - Centralized model config
 * - Mastra structured output for reliable parsing
 */

import { z } from 'zod'
import { Agent } from '@mastra/core/agent'
import { v4 as uuidv4 } from 'uuid'
import {
    createAgentTrace,
    recordAgentGeneration,
    recordAgentThinking,
    recordAgentScore,
    withSpan,
    langfuse
} from '../../../../agent-core/observability'
import { getWorkflowTraceId } from '../../utils/workflow-context'
import { EPISODE_PREMISE_PROMPT } from '../../prompts/agents/episode-premise'
import { 
    MODELS, 
    IMPROVEMENT_LOOP 
} from '../../../../agent-core/models'
import { getMastraInstance } from './mastra-instance'
import { runImprovementLoop, judgeMazur, MazurJudgment } from '../../../../agent-core/judging'

/**
 * Zod Schema for Episode Premise (Ozymandias Framework)
 * See: https://mastra.ai/docs/agents/structured-output
 */
export const EpisodePremiseSchema = z.object({
    title: z.string().describe('Episode title'),
    logline: z.string().describe('Single sentence summary highlighting the central paradox'),
    theHook: z.string().describe('Opening image/situation as visual metaphor'),
    theTurn: z.string().describe('The moment of no return - the Ozymandias moment'),
    theAftermath: z.string().describe('The permanent scars left on world/characters'),
    protagonistHook: z.string().describe('Character-specific entry point forcing action'),
    fatalFlaw: z.string().describe('Internal psychological wound or arrogance driving conflict'),
    stakes: z.string().describe('Tiered stakes: Physical/Professional/Psychological'),
    transformation: z.string().describe('Specific internal shift from start to end'),
    inevitableConsequence: z.string().describe('The trap the character fell into by being themselves'),
    thematicFocus: z.string().describe('Central philosophical question'),
    charactersInvolved: z.array(z.string()).describe('Characters involved in this episode'),
})

/**
 * Schema for follow-up actions (properly typed for OpenAI response_format)
 * Note: z.any() is NOT compatible with OpenAI structured output - must have defined schema
 */
export const PremiseActionSchema = z.object({
    type: z.string().describe('Action type'),
    description: z.string().describe('Action description'),
})

export const PremiseArchitectResponseSchema = z.object({
    message: z.string().describe('Brief explanation of why this premise works structurally'),
    episodePremise: EpisodePremiseSchema,
    actions: z.array(PremiseActionSchema).optional().describe('Optional follow-up actions'),
    confidence: z.number().min(0).max(1).describe('Confidence score 0-1'),
})

export type EpisodePremise = z.infer<typeof EpisodePremiseSchema>
export type PremiseArchitectResponse = z.infer<typeof PremiseArchitectResponseSchema>

interface PremiseArchitectConfig {
    traceId?: string
    projectId?: string
    episodeId?: string
    /** Enable Mazur self-improvement loop (default: true) */
    useMazurLoop?: boolean
    /** Max iterations for improvement loop (default: 20) */
    maxIterations?: number
    /** Quality threshold to pass (0-1, default: 0.85) */
    qualityThreshold?: number
    /** Callback for each iteration (UI updates) */
    onIteration?: (iteration: any) => void
}

interface GenerationResult {
    text: string
    thinking?: string
    mazurJudgment?: MazurJudgment
    iterations: number
    finalScore?: number
    traceId: string
    converged?: boolean
}

export class PremiseArchitectAgent {
    private agent: Agent
    private traceId: string
    private config: PremiseArchitectConfig

    private constructor(config: PremiseArchitectConfig) {
        this.config = {
            useMazurLoop: true,
            maxIterations: IMPROVEMENT_LOOP.maxIterations,
            qualityThreshold: IMPROVEMENT_LOOP.qualityThreshold,
            ...config
        }
        this.traceId = config.traceId || getWorkflowTraceId() || uuidv4()

        const m = getMastraInstance()

        // Use string model identifier for AI SDK v5 compatibility with Mastra
        // The model string format is 'provider:model-id' e.g. 'openai:gpt-4o'
        const modelString = MODELS.generation.primary.replace(':', '/')
        
        this.agent = new Agent({
            id: 'premise-architect',
            name: 'Premise Architect',
            instructions: EPISODE_PREMISE_PROMPT,
            model: modelString, // String model ID for Mastra AI SDK v5 compatibility
            mastra: m,
        })

        this.createAgentTrace()
    }

    private createAgentTrace() {
        createAgentTrace({
            traceId: this.traceId,
            agentName: 'PremiseArchitect',
            projectId: this.config.projectId,
            episodeId: this.config.episodeId
        })
    }

    getTraceId(): string {
        return this.traceId
    }

    static async create(
        modelName: string = MODELS.generation.primary,
        options?: Omit<PremiseArchitectConfig, 'modelName'>
    ): Promise<PremiseArchitectAgent> {
        return new PremiseArchitectAgent(options || {})
    }

    /**
     * Generate an episode premise with Mazur Framework improvement loop
     */
    async generatePremise(
        context: string,
        projectId: string,
        traceId?: string
    ): Promise<GenerationResult> {
        const id = traceId || this.traceId

        return withSpan(id, 'PremiseArchitectAgent.generatePremise', async () => {
            // === STEP 1: Initial Generation with Structured Output ===
            const initialPrompt = `Generate a new episode premise.
Context:
${context}

Ensure strict adherence to the Ozymandias Framework.`

            // Use Mastra structured output for reliable typed responses
            // See: https://mastra.ai/docs/agents/structured-output
            const initialResponse = await this.agent.generate(initialPrompt, {
                structuredOutput: {
                    schema: PremiseArchitectResponseSchema,
                },
                tracingOptions: { traceId: id }
            })
            
            // With structured output, we get typed object directly
            const responseObject = initialResponse.object as PremiseArchitectResponse | undefined
            let currentText = responseObject 
                ? JSON.stringify(responseObject, null, 2) 
                : initialResponse.text
            const thinking = (initialResponse as any).reasoning || 
                           (initialResponse as any).thinking || 
                           (initialResponse as any).steps?.[0]?.thinking

            recordAgentGeneration(
                id,
                'PremiseArchitect-Initial',
                { prompt: initialPrompt, context: context.slice(0, 500) },
                { text: currentText, thinking },
                { model: MODELS.generation.primary }
            )

            if (thinking) {
                recordAgentThinking(id, 'PremiseArchitect', thinking)
            }

            // === Skip Mazur loop if disabled ===
            if (!this.config.useMazurLoop) {
                return { text: currentText, thinking, iterations: 1, traceId: id }
            }

            // === STEP 2: Run Mazur Self-Improvement Loop ===
            langfuse.event({
                traceId: id,
                name: 'mazur_loop_start',
                input: { 
                    initialContentLength: currentText.length,
                    maxIterations: this.config.maxIterations,
                    qualityThreshold: this.config.qualityThreshold
                },
            })

            const loopResult = await runImprovementLoop(currentText, {
                maxIterations: this.config.maxIterations,
                qualityThreshold: this.config.qualityThreshold,
                traceId: id,
                projectId,
                onIteration: (iteration) => {
                    // Emit progress to UI
                    this.config.onIteration?.(iteration)
                    
                    // Log each iteration for Langfuse visibility
                    console.log(`[PremiseArchitect] Iteration ${iteration.iteration}: ` +
                        `Score ${iteration.judgment.overallScore.toFixed(3)} ` +
                        `(${iteration.improved ? '+' : ''}${iteration.delta.toFixed(3)}) ` +
                        `Verdict: ${iteration.judgment.verdict}`)
                }
            })

            // Record final scores
            recordAgentScore(id, 'mazur_depth', loopResult.iterations[loopResult.iterations.length - 1].judgment.depth.score, 'GRRM dimension')
            recordAgentScore(id, 'mazur_structure', loopResult.iterations[loopResult.iterations.length - 1].judgment.structure.score, 'Gilligan dimension')
            recordAgentScore(id, 'mazur_feeling', loopResult.iterations[loopResult.iterations.length - 1].judgment.feeling.score, 'Lynch dimension')
            recordAgentScore(id, 'mazur_final', loopResult.finalScore, 'Final Mazur score')
            recordAgentScore(id, 'mazur_iterations', loopResult.totalIterations, 'Iterations needed')

            langfuse.event({
                traceId: id,
                name: 'mazur_loop_complete',
                output: {
                    exitReason: loopResult.exitReason,
                    iterations: loopResult.totalIterations,
                    converged: loopResult.converged,
                    finalScore: loopResult.finalScore,
                },
            })

            console.log(`[PremiseArchitect] Mazur loop complete: ${loopResult.exitReason} ` +
                `after ${loopResult.totalIterations} iterations. ` +
                `Final score: ${loopResult.finalScore.toFixed(3)}`)

            return {
                text: loopResult.finalContent,
                thinking,
                mazurJudgment: loopResult.iterations[loopResult.iterations.length - 1].judgment,
                iterations: loopResult.totalIterations,
                finalScore: loopResult.finalScore,
                traceId: id,
                converged: loopResult.converged
            }
        }, { projectId })
    }

    /**
     * Quick generation without Mazur loop (for regenerating single sections)
     */
    async generateSection(
        section: 'protagonistHook' | 'fatalFlaw' | 'stakes' | 'inevitableConsequence' | 'theHook' | 'theTurn' | 'theAftermath',
        existingPremise: any,
        context: string,
        traceId?: string
    ): Promise<{ text: string }> {
        const id = traceId || this.traceId

        const sectionPrompts: Record<string, string> = {
            protagonistHook: 'the character-specific entry point that forces the protagonist to act',
            fatalFlaw: 'the internal psychological wound or arrogance driving the conflict',
            stakes: 'the tiered stakes (Physical/Professional/Psychological)',
            inevitableConsequence: 'the "Trap" the character fell into by being themselves',
            theHook: 'the opening image/situation that serves as a visual metaphor',
            theTurn: 'the moment of no return, the "Ozymandias" moment',
            theAftermath: 'the permanent scars left on the world/characters'
        }

        const prompt = `Regenerate ONLY the "${section}" section for this episode premise.

Current premise:
${JSON.stringify(existingPremise, null, 2)}

Context:
${context.slice(0, 500)}

Generate a new, stronger version of ${sectionPrompts[section]}.
Make it more specific, more visceral, and more logically inevitable.`

        // Create dynamic schema for the specific section
        const sectionSchema = z.object({
            [section]: z.string().describe(sectionPrompts[section])
        })

        // Use Mastra structured output for reliable typed responses
        const response = await this.agent.generate(prompt, {
            structuredOutput: {
                schema: sectionSchema,
            },
            tracingOptions: { traceId: id }
        })

        // Return as JSON string for compatibility with existing flow
        const result = response.object || { [section]: response.text }
        return { text: JSON.stringify(result, null, 2) }
    }

    /**
     * Judge existing content with Mazur Framework (without improvement)
     */
    async judgePremise(
        premiseText: string,
        traceId?: string
    ): Promise<MazurJudgment> {
        const id = traceId || this.traceId
        return judgeMazur(premiseText, id)
    }
}

export async function createPremiseArchitectAgent(
    modelName: string = MODELS.generation.primary,
    options?: { 
        traceId?: string
        projectId?: string
        episodeId?: string
        useMazurLoop?: boolean
        maxIterations?: number
        qualityThreshold?: number
        onIteration?: (iteration: any) => void
    }
): Promise<PremiseArchitectAgent> {
    return PremiseArchitectAgent.create(modelName, options)
}
