/**
 * Agent Integration Tools with Langfuse Tracing
 *
 * "Meta Tools" that allow the main Storyteller Agent to consult with
 * the specialized Council agents (Psychologist, Consequence Tracker, etc.)
 *
 * Each tool propagates trace context to child agents for full observability.
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { createPsychologistAgent } from '../../agents/v2/psychologist-agent'
import { createConsequenceAgent } from '../../agents/v2/consequence-agent'
import { createDevilsAdvocateAgent } from '../../agents/v2/devils-advocate-agent'
import { createGardenerAgent } from '../../agents/v2/gardener-agent'
import { createPremiseArchitectAgent } from '../../agents/v2/premise-architect-agent'
import { getWorkflowTraceId, getWorkflowEventBus } from '../../utils/workflow-context'
import { langfuse } from '../../../../agent-core/observability'

import { WORKFLOW_EVENTS } from '../../utils/workflow-context'

/**
 * Helper to emit agent consultation event
 */
function emitConsultEvent(agentName: string, status: 'start' | 'complete', data?: any) {
    const eventBus = getWorkflowEventBus()
    if (eventBus) {
        eventBus.emit('AGENT_CONSULT', { agent: agentName, status, ...data })
    }
}

/**
 * Helper to emit agent thinking to the UI
 */
function emitAgentThinking(agentName: string, thinking: string) {
    const eventBus = getWorkflowEventBus()
    if (eventBus && thinking) {
        eventBus.emit(WORKFLOW_EVENTS.AGENT_THOUGHT, {
            agent: agentName,
            thinking,
            timestamp: Date.now()
        })
    }
}

/**
 * Consult Psychologist Tool
 */
export const consultPsychologistTool = createTool({
    id: 'consult_psychologist',
    description: 'Consult the Psychologist Agent to analyze character profiles, simulate reactions, or assess relationship dynamics.',
    inputSchema: z.object({
        task: z.enum(['profile_analysis', 'simulate_reaction', 'relationship_assessment']),
        characterName: z.string().describe('Primary character name'),
        targetName: z.string().optional().describe('Secondary character for relationships'),
        context: z.string().describe('Context, event, or description to analyze'),
        projectId: z.string().nullish().describe('Project ID for tracing'),
        episodeId: z.string().nullish().describe('Episode ID for tracing'),
    }),
    execute: async (args: any) => { const context = args?.context || args;
        // Get trace context from workflow
        const traceId = getWorkflowTraceId()

        // Create span for this consultation
        const span = langfuse.span({
            traceId: traceId || undefined,
            name: 'consult_psychologist',
            input: { task: context.task, character: context.characterName },
            metadata: { agentType: 'Psychologist' }
        })

        emitConsultEvent('Psychologist', 'start', { task: context.task })

        try {
            // Create agent with trace context
            const agent = await createPsychologistAgent('openai:gpt-4o', {
                traceId: traceId || undefined,
                projectId: context.projectId,
                episodeId: context.episodeId
            })

            let result: { text: string; thinking?: string }

            switch (context.task) {
                case 'profile_analysis':
                    result = await agent.analyzeProfile(context.characterName, context.context, traceId || undefined)
                    break
                case 'simulate_reaction':
                    result = await agent.simulateReaction(context.characterName, 'Event from context', context.context, traceId || undefined)
                    break
                case 'relationship_assessment':
                    if (!context.targetName) throw new Error('Target name required for relationship assessment')
                    result = await agent.assessRelationship(context.characterName, context.targetName, [context.context], traceId || undefined)
                    break
                default:
                    result = { text: "Unknown task" }
            }

            // Emit thinking to UI if present
            if (result.thinking) {
                emitAgentThinking('Psychologist', result.thinking)
            }

            emitConsultEvent('Psychologist', 'complete', { hasThinking: !!result.thinking })
            span.end({ output: { text: result.text.slice(0, 500), hasThinking: !!result.thinking } })

            return result.text
        } catch (error: any) {
            span.end({ level: 'ERROR', statusMessage: error.message })
            throw error
        }
    }
})

/**
 * Consult Consequence Tracker Tool
 */
export const consultConsequenceTrackerTool = createTool({
    id: 'consult_consequence_tracker',
    description: 'Consult the Consequence Agent to check story continuity, causality, and logic violations.',
    inputSchema: z.object({
        task: z.enum(['validate_continuity', 'check_causality']),
        beatId: z.string().optional(),
        content: z.string().describe('The action, beat, or scene to check'),
        context: z.string().describe('Prior state or full context'),
        projectId: z.string().nullish(),
        episodeId: z.string().nullish(),
    }),
    execute: async (args: any) => { const context = args?.context || args;
        const traceId = getWorkflowTraceId()

        const span = langfuse.span({
            traceId: traceId || undefined,
            name: 'consult_consequence_tracker',
            input: { task: context.task, beatId: context.beatId },
            metadata: { agentType: 'ConsequenceTracker' }
        })

        emitConsultEvent('ConsequenceTracker', 'start', { task: context.task })

        try {
            const agent = await createConsequenceAgent('openai:gpt-4o', {
                traceId: traceId || undefined,
                projectId: context.projectId,
                episodeId: context.episodeId
            })

            let result: { text: string; thinking?: string }

            if (context.task === 'validate_continuity') {
                result = await agent.validateContinuity(
                    context.beatId || 'unknown',
                    context.context + '\n\nContent: ' + context.content,
                    traceId || undefined
                )
            } else {
                result = await agent.checkCausality(context.content, context.context, traceId || undefined)
            }

            // Emit thinking to UI if present
            if (result.thinking) {
                emitAgentThinking('ConsequenceTracker', result.thinking)
            }

            emitConsultEvent('ConsequenceTracker', 'complete', { hasThinking: !!result.thinking })
            span.end({ output: { text: result.text.slice(0, 500), hasThinking: !!result.thinking } })

            return result.text
        } catch (error: any) {
            span.end({ level: 'ERROR', statusMessage: error.message })
            throw error
        }
    }
})

/**
 * Consult Devil's Advocate Tool
 */
export const consultDevilsAdvocateTool = createTool({
    id: 'consult_devils_advocate',
    description: 'Consult the Devil\'s Advocate to critique the story for clichés, plot holes, and mediocrity.',
    inputSchema: z.object({
        content: z.string().describe('The story beat or scene to critique'),
        context: z.string().describe('Surrounding context'),
        projectId: z.string().nullish(),
        episodeId: z.string().nullish(),
    }),
    execute: async (args: any) => { const context = args?.context || args;
        const traceId = getWorkflowTraceId()

        const span = langfuse.span({
            traceId: traceId || undefined,
            name: 'consult_devils_advocate',
            input: { contentPreview: context.content.slice(0, 200) },
            metadata: { agentType: 'DevilsAdvocate' }
        })

        emitConsultEvent('DevilsAdvocate', 'start')

        try {
            const agent = await createDevilsAdvocateAgent('openai:gpt-4o', {
                traceId: traceId || undefined,
                projectId: context.projectId,
                episodeId: context.episodeId
            })

            const result = await agent.critique(context.content, context.context, traceId || undefined)

            // Emit thinking to UI if present
            if (result.thinking) {
                emitAgentThinking('DevilsAdvocate', result.thinking)
            }

            emitConsultEvent('DevilsAdvocate', 'complete', { hasThinking: !!result.thinking })
            span.end({ output: { text: result.text.slice(0, 500), hasThinking: !!result.thinking } })

            return result.text
        } catch (error: any) {
            span.end({ level: 'ERROR', statusMessage: error.message })
            throw error
        }
    }
})

/**
 * Consult Gardener Tool
 */
export const consultGardenerTool = createTool({
    id: 'consult_gardener',
    description: 'Consult The Gardener to generate vivid, sensory prose or optimize existing text to "Show, Don\'t Tell".',
    inputSchema: z.object({
        task: z.enum(['write_scene', 'optimize_prose']),
        content: z.string().describe('Outline (for write) or Draft (for optimize)'),
        context: z.string().optional().describe('Additional context'),
        projectId: z.string().nullish(),
        episodeId: z.string().nullish(),
    }),
    execute: async (args: any) => { const context = args?.context || args;
        const traceId = getWorkflowTraceId()

        const span = langfuse.span({
            traceId: traceId || undefined,
            name: 'consult_gardener',
            input: { task: context.task },
            metadata: { agentType: 'Gardener' }
        })

        emitConsultEvent('Gardener', 'start', { task: context.task })

        try {
            const agent = await createGardenerAgent('openai:gpt-4o', {
                traceId: traceId || undefined,
                projectId: context.projectId,
                episodeId: context.episodeId
            })

            let result: { text: string; thinking?: string }

            if (context.task === 'write_scene') {
                result = await agent.writeScene(context.content, context.context || '', traceId || undefined)
            } else {
                result = await agent.optimizeProse(context.content, traceId || undefined)
            }

            // Emit thinking to UI if present
            if (result.thinking) {
                emitAgentThinking('Gardener', result.thinking)
            }

            emitConsultEvent('Gardener', 'complete', { hasThinking: !!result.thinking })
            span.end({ output: { text: result.text.slice(0, 500), hasThinking: !!result.thinking } })

            return result.text
        } catch (error: any) {
            span.end({ level: 'ERROR', statusMessage: error.message })
            throw error
        }
    }
})

/**
 * Valid episode premise sections that can be regenerated
 */
const PREMISE_SECTIONS = [
    'protagonistHook',
    'fatalFlaw', 
    'stakes',
    'inevitableConsequence',
    'theHook',
    'theTurn',
    'theAftermath',
    'transformation',
    'thematicFocus',
    'logline',
    'title'
] as const

type PremiseSection = typeof PREMISE_SECTIONS[number]

/**
 * Consult Premise Architect Tool
 */
export const consultPremiseArchitectTool = createTool({
    id: 'consult_premise_architect',
    description: `Consult the Premise Architect to generate or regenerate episode premises using the Ozymandias Framework.
    
Tasks:
- generate_premise: Generate a complete new episode premise
- regenerate_section: Regenerate ONLY a specific section of an existing premise

Valid sections for regenerate_section: ${PREMISE_SECTIONS.join(', ')}`,
    inputSchema: z.object({
        task: z.enum(['generate_premise', 'regenerate_section']),
        section: z.enum(PREMISE_SECTIONS).optional().describe('Section to regenerate (required for regenerate_section task)'),
        existingPremise: z.record(z.string()).optional().describe('Current premise data (required for regenerate_section)'),
        context: z.string().describe('Project context, characters, and any user instructions'),
        projectId: z.string().describe('Project ID for context tracking'),
        episodeId: z.string().nullish(),
    }),
    execute: async (args: any) => {
        // Mastra 1.x passes args directly. For tools with a 'context' field in schema,
        // we can't use args?.context || args since that returns the context STRING.
        // Instead, check if args has 'task' property (our schema field) to determine format.
        const toolArgs = args?.task ? args : (args?.context || args)
        const traceId = getWorkflowTraceId()
        const { task, section, existingPremise, context: storyContext, projectId, episodeId } = toolArgs

        const span = langfuse.span({
            traceId: traceId || undefined,
            name: 'consult_premise_architect',
            input: { projectId, task, section },
            metadata: { agentType: 'PremiseArchitect' }
        })

        emitConsultEvent('PremiseArchitect', 'start')

        try {
            const agent = await createPremiseArchitectAgent('openai:gpt-4o', {
                traceId: traceId || undefined,
                projectId,
                episodeId,
                useMazurLoop: task === 'generate_premise', // Only use Mazur loop for full generation
                maxIterations: 20,
                qualityThreshold: 0.85,
                onIteration: (iteration) => {
                    const eventBus = getWorkflowEventBus()
                    eventBus?.emit(WORKFLOW_EVENTS.AGENT_PROGRESS, {
                        agentType: 'PremiseArchitect',
                        iteration: iteration.iteration,
                        score: iteration.judgment.overallScore,
                        verdict: iteration.judgment.verdict,
                    })
                }
            })

            let result: { text: string; thinking?: string }

            if (task === 'regenerate_section' && section && existingPremise) {
                // Regenerate only the specified section
                console.log(`[PremiseArchitect] Regenerating section: ${section}`)
                result = await agent.regenerateSection(
                    section as any,
                    existingPremise,
                    storyContext,
                    traceId || undefined
                )
                
                // Parse the result and merge with existing premise
                try {
                    const parsed = JSON.parse(result.text)
                    const updatedPremise = {
                        ...existingPremise,
                        ...parsed
                    }
                    
                    // Return a response matching the expected format
                    return JSON.stringify({
                        message: `Regenerated ${section} successfully.`,
                        episodePremise: updatedPremise,
                        regeneratedSection: section,
                        newValue: parsed[section],
                        confidence: 0.9
                    })
                } catch (parseError) {
                    // If parsing fails, return the raw text
                    console.warn('[PremiseArchitect] Failed to parse regenerated section:', parseError)
                    return result.text
                }
            } else {
                // Full premise generation
                result = await agent.generatePremise(storyContext, projectId, traceId || undefined) as any
            }

            // Emit thinking to UI if present
            if (result.thinking) {
                emitAgentThinking('PremiseArchitect', result.thinking)
            }

            // Log Mazur quality metrics (only for full generation)
            const qualityInfo = (result as any).mazurJudgment ? {
                iterations: (result as any).iterations,
                finalScore: (result as any).finalScore,
                converged: (result as any).converged,
                mazur: {
                    depth: (result as any).mazurJudgment.depth.score,
                    structure: (result as any).mazurJudgment.structure.score,
                    feeling: (result as any).mazurJudgment.feeling.score,
                    slop: (result as any).mazurJudgment.slopScore,
                }
            } : { iterations: (result as any).iterations || 1 }

            emitConsultEvent('PremiseArchitect', 'complete', { 
                hasThinking: !!result.thinking,
                task,
                section,
                ...qualityInfo
            })
            
            span.end({ output: { 
                text: result.text.slice(0, 500), 
                hasThinking: !!result.thinking,
                ...qualityInfo
            }})

            return result.text
        } catch (error: any) {
            span.end({ level: 'ERROR', statusMessage: error.message })
            throw error
        }
    }
})

export const agentTools = [
    consultPsychologistTool,
    consultConsequenceTrackerTool,
    consultDevilsAdvocateTool,
    consultGardenerTool,
    consultPremiseArchitectTool
]
