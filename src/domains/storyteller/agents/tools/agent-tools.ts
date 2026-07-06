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
import { createPsychologistAgent } from '@/domains/storyteller/agents/council/PsychologistAgent'
import { createConsequenceAgent } from '@/domains/storyteller/agents/council/ConsequenceAgent'
import { createDevilsAdvocateAgent } from '@/domains/storyteller/agents/council/DevilsAdvocateAgent'
import { createGardenerAgent } from '@/domains/storyteller/agents/council/GardenerAgent'
import { createPremiseArchitectAgent } from '@/domains/storyteller/agents/council/PremiseArchitectAgent'
import { runConsistencyCheck } from '@/domains/storyteller/agents/judges/ConsistencyAgent'
import { CreativeDirectorAgent } from '@/domains/storyteller/agents/judges/CreativeDirectorAgent'
import { getWorkflowTraceId, getWorkflowEventBus } from '@/domains/storyteller/agents/orchestration/WorkflowContext'
import { langfuse } from '@/shared/observability/observability'
import { characters, storyPlans } from '@/db'
import { db } from '@/db/client'
import { eq } from 'drizzle-orm'

import { WORKFLOW_EVENTS } from '@/domains/storyteller/agents/orchestration/WorkflowContext'
import { getErrorMessage } from '@/shared/errors/error-utils'
import type { MazurJudgment } from '@/shared/agent-kernel/judging'
import { ReferenceValidator } from '@/domains/storyteller/services/ReferenceValidatorService'

/** Shape returned by PremiseArchitectAgent.generatePremise */
interface PremiseGenerationResult {
  text: string
  thinking?: string
  mazurJudgment?: MazurJudgment
  iterations: number
  finalScore?: number
  traceId: string
  converged?: boolean
}

/**
 * Helper to emit agent consultation event
 */
function emitConsultEvent(agentName: string, status: 'start' | 'complete', data?: Record<string, unknown>) {
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
      timestamp: Date.now(),
    })
  }
}

/**
 * Consult Psychologist Tool
 */
export const consultPsychologistTool = createTool({
  id: 'consult_psychologist',
  description:
    'Consult the Psychologist Agent to analyze character profiles, simulate reactions, or assess relationship dynamics.',
  inputSchema: z.object({
    task: z.enum(['profile_analysis', 'simulate_reaction', 'relationship_assessment']),
    characterName: z.string().describe('Primary character name'),
    targetName: z.string().optional().describe('Secondary character for relationships'),
    context: z.string().describe('Context, event, or description to analyze'),
    projectId: z.string().nullish().describe('Project ID for tracing'),
    episodeId: z.string().nullish().describe('Episode ID for tracing'),
  }),
  execute: async (args: any) => {
    const context = args
    // Get trace context from workflow
    const traceId = getWorkflowTraceId()

    // Create span for this consultation
    const span = langfuse.span({
      traceId: traceId || undefined,
      name: 'consult_psychologist',
      input: { task: context.task, character: context.characterName },
      metadata: { agentType: 'Psychologist' },
    })

    emitConsultEvent('Psychologist', 'start', { task: context.task })

    try {
      // Create agent with trace context
      const agent = await createPsychologistAgent('openai:gpt-4o', {
        traceId: traceId || undefined,
        projectId: context.projectId,
        episodeId: context.episodeId,
      })

      let result: { text: string; thinking?: string }

      switch (context.task) {
        case 'profile_analysis':
          result = await agent.analyzeProfile(
            context.characterName,
            context.context,
            traceId || undefined
          )
          break
        case 'simulate_reaction':
          result = await agent.simulateReaction(
            context.characterName,
            'Event from context',
            context.context,
            traceId || undefined
          )
          break
        case 'relationship_assessment':
          if (!context.targetName)
            throw new Error('Target name required for relationship assessment')
          result = await agent.assessRelationship(
            context.characterName,
            context.targetName,
            [context.context],
            traceId || undefined
          )
          break
        default:
          result = { text: 'Unknown task' }
      }

      // Emit thinking to UI if present
      if (result.thinking) {
        emitAgentThinking('Psychologist', result.thinking)
      }

      emitConsultEvent('Psychologist', 'complete', { hasThinking: !!result.thinking })
      span.end({ output: { text: result.text.slice(0, 500), hasThinking: !!result.thinking } })

      return result.text
    } catch (error: unknown) {
      span.end({ level: 'ERROR', statusMessage: getErrorMessage(error) })
      throw error
    }
  },
})

/**
 * Consult Consequence Tracker Tool
 */
export const consultConsequenceTrackerTool = createTool({
  id: 'consult_consequence_tracker',
  description:
    'Consult the Consequence Agent to check story continuity, causality, and logic violations.',
  inputSchema: z.object({
    task: z.enum(['validate_continuity', 'check_causality']),
    beatId: z.string().optional(),
    content: z.string().describe('The action, beat, or scene to check'),
    context: z.string().describe('Prior state or full context'),
    projectId: z.string().nullish(),
    episodeId: z.string().nullish(),
  }),
  execute: async (args: any) => {
    const context = args
    const traceId = getWorkflowTraceId()

    const span = langfuse.span({
      traceId: traceId || undefined,
      name: 'consult_consequence_tracker',
      input: { task: context.task, beatId: context.beatId },
      metadata: { agentType: 'ConsequenceTracker' },
    })

    emitConsultEvent('ConsequenceTracker', 'start', { task: context.task })

    try {
      const agent = await createConsequenceAgent('openai:gpt-4o', {
        traceId: traceId || undefined,
        projectId: context.projectId,
        episodeId: context.episodeId,
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
    } catch (error: unknown) {
      span.end({ level: 'ERROR', statusMessage: getErrorMessage(error) })
      throw error
    }
  },
})

/**
 * Consult Devil's Advocate Tool
 */
export const consultDevilsAdvocateTool = createTool({
  id: 'consult_devils_advocate',
  description:
    'Consult the Devil\'s Advocate to critique the story for clichés, plot holes, and mediocrity.',
  inputSchema: z.object({
    content: z.string().describe('The story beat or scene to critique'),
    context: z.string().describe('Surrounding context'),
    projectId: z.string().nullish(),
    episodeId: z.string().nullish(),
  }),
  execute: async (args: any) => {
    const context = args
    const traceId = getWorkflowTraceId()

    const span = langfuse.span({
      traceId: traceId || undefined,
      name: 'consult_devils_advocate',
      input: { contentPreview: context.content.slice(0, 200) },
      metadata: { agentType: 'DevilsAdvocate' },
    })

    emitConsultEvent('DevilsAdvocate', 'start')

    try {
      const agent = await createDevilsAdvocateAgent('openai:gpt-4o', {
        traceId: traceId || undefined,
        projectId: context.projectId,
        episodeId: context.episodeId,
      })

      const result = await agent.critique(context.content, context.context, traceId || undefined)

      // Emit thinking to UI if present
      if (result.thinking) {
        emitAgentThinking('DevilsAdvocate', result.thinking)
      }

      emitConsultEvent('DevilsAdvocate', 'complete', { hasThinking: !!result.thinking })
      span.end({ output: { text: result.text.slice(0, 500), hasThinking: !!result.thinking } })

      return result.text
    } catch (error: unknown) {
      span.end({ level: 'ERROR', statusMessage: getErrorMessage(error) })
      throw error
    }
  },
})

/**
 * Consult Gardener Tool
 */
export const consultGardenerTool = createTool({
  id: 'consult_gardener',
  description:
    'Consult The Gardener to generate vivid, sensory prose or optimize existing text to "Show, Don\'t Tell".',
  inputSchema: z.object({
    task: z.enum(['write_scene', 'optimize_prose']),
    content: z.string().describe('Outline (for write) or Draft (for optimize)'),
    context: z.string().optional().describe('Additional context'),
    projectId: z.string().nullish(),
    episodeId: z.string().nullish(),
  }),
  execute: async (args: any) => {
    const context = args
    const traceId = getWorkflowTraceId()

    const span = langfuse.span({
      traceId: traceId || undefined,
      name: 'consult_gardener',
      input: { task: context.task },
      metadata: { agentType: 'Gardener' },
    })

    emitConsultEvent('Gardener', 'start', { task: context.task })

    try {
      const agent = await createGardenerAgent('openai:gpt-4o', {
        traceId: traceId || undefined,
        projectId: context.projectId,
        episodeId: context.episodeId,
      })

      let result: { text: string; thinking?: string }

      if (context.task === 'write_scene') {
        result = await agent.writeScene(
          context.content,
          context.context || '',
          traceId || undefined
        )
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
    } catch (error: unknown) {
      span.end({ level: 'ERROR', statusMessage: getErrorMessage(error) })
      throw error
    }
  },
})

/**
 * Validate References Tool
 */
export const validateReferencesTool = createTool({
  id: 'validate_references',
  description:
    'Validate and autofix entity references within text. Use this to ensure all references (like Characters and Places) are valid or to formally register new items or events you just invented.',
  inputSchema: z.object({
    content: z.string().describe('The text containing MD-style [Entity Name][entity-id] references to validate'),
    projectId: z.string().describe('Project ID for context tracking'),
  }),
  execute: async (args: any) => {
    const context = args
    const traceId = getWorkflowTraceId()

    const span = langfuse.span({
      traceId: traceId || undefined,
      name: 'validate_references',
      input: { textPreview: context.content?.slice(0, 100) },
      metadata: { agentType: 'ReferenceValidator' },
    })

    try {
      const validated = await ReferenceValidator.validate(context.content, context.projectId)
      span.end({ output: { textPreview: validated.slice(0, 100) } })
      return validated
    } catch (error: unknown) {
      span.end({ level: 'ERROR', statusMessage: getErrorMessage(error) })
      return context.content // fallback to unvalidated text
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
  'title',
  'tenPointsPlan',
] as const

type PremiseSection = (typeof PREMISE_SECTIONS)[number]

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
    section: z
      .enum(PREMISE_SECTIONS)
      .optional()
      .describe('Section to regenerate (required for regenerate_section task)'),
    existingPremise: z
      .record(z.string())
      .optional()
      .describe('Current premise data (required for regenerate_section)'),
    context: z.string().describe('Project context, characters, and any user instructions'),
    projectId: z.string().describe('Project ID for context tracking'),
    episodeId: z.string().nullish(),
  }),
  execute: async (args: any) => {
    // Mastra 1.x passes args directly. For tools with a 'context' field in schema,
    // we can't use args?.context || args since that returns the context STRING.
    // Instead, check if args has 'task' property (our schema field) to determine format.
    const toolArgs = args?.task ? args : args?.context || args
    const traceId = getWorkflowTraceId()
    const { task, section, existingPremise, context: storyContext, projectId, episodeId } = toolArgs

    const span = langfuse.span({
      traceId: traceId || undefined,
      name: 'consult_premise_architect',
      input: { projectId, task, section },
      metadata: { agentType: 'PremiseArchitect' },
    })

    emitConsultEvent('PremiseArchitect', 'start')

    // Enrich context with cast from DB if not already included
    let enrichedContext = storyContext || ''
    if (projectId && !enrichedContext.includes('--- CAST ---')) {
      try {
        const [castRows, planRows] = await Promise.all([
          db.select({ name: characters.name, role: characters.role, description: characters.description })
            .from(characters).where(eq(characters.projectId, projectId)),
          db.select({ content: storyPlans.content })
            .from(storyPlans).where(eq(storyPlans.projectId, projectId)).limit(1),
        ])
        if (castRows.length > 0) {
          enrichedContext += '\n\n--- CAST ---\n'
          castRows.forEach(c => {
            enrichedContext += `- ${c.name} (${c.role || 'Unknown role'}): ${c.description || 'No description'}\n`
          })
        }
        // Also include key story plan fields if missing from context
        const plan = (planRows[0]?.content as Record<string, unknown>) || {}
        if (plan.worldDescription && !enrichedContext.includes('WORLD DESCRIPTION')) {
          enrichedContext += `\n--- WORLD DESCRIPTION ---\n${plan.worldDescription}\n`
        }
        if (Array.isArray(plan.items) && plan.items.length > 0 && !enrichedContext.includes('--- ITEMS ---')) {
          enrichedContext += `\n--- ITEMS ---\n${(plan.items as Array<{ id?: string; name: string; description?: string }>).map((i) => {
            const itemId = 'item-' + (i.id?.slice(0, 8) || i.name.toLowerCase().replace(/\s+/g, '-'))
            return '- [' + i.name + '][' + itemId + ']: ' + (i.description || 'No description')
          }).join('\n')}\n`
        }
        if (Array.isArray(plan.events) && plan.events.length > 0 && !enrichedContext.includes('--- EVENTS ---')) {
          enrichedContext += `\n--- EVENTS ---\n${(plan.events as Array<{ id?: string; name: string; description?: string }>).map((e) => {
            const eventId = 'event-' + (e.id?.slice(0, 8) || e.name.toLowerCase().replace(/\s+/g, '-'))
            return '- [' + e.name + '][' + eventId + ']: ' + (e.description || 'No description')
          }).join('\n')}\n`
        }
        if (Array.isArray(plan.worldRules) && plan.worldRules.length > 0 && !enrichedContext.includes('--- WORLD RULES ---')) {
          enrichedContext += `\n--- WORLD RULES ---\n${(plan.worldRules as Array<{ id?: string; name?: string; category?: string; rule?: string }>).map((r) => {
            const ruleId = 'rule-' + (r.id?.slice(0, 8) || r.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown')
            return '- [' + (r.name || r.category || 'Rule') + '][' + ruleId + ']: ' + (r.rule || 'No description')
          }).join('\n')}\n`
        }
      } catch (e) {
        console.warn('[consult_premise_architect] Failed to enrich context with cast:', e)
      }
    }

    try {
      const agent = await createPremiseArchitectAgent('openai:gpt-4o', {
        traceId: traceId || undefined,
        projectId,
        episodeId,
        useMazurLoop: task === 'generate_premise', // Only use Mazur loop for full generation
        maxIterations: 25,
        qualityThreshold: 0.92,
        onIteration: iteration => {
          const eventBus = getWorkflowEventBus()
          eventBus?.emit(WORKFLOW_EVENTS.AGENT_PROGRESS, {
            agentType: 'PremiseArchitect',
            iteration: iteration.iteration,
            score: iteration.judgment.overallScore,
            verdict: iteration.judgment.verdict,
          })
        },
      })

      let result: { text: string; thinking?: string }

      if (task === 'regenerate_section' && section && existingPremise) {
        // Regenerate only the specified section
        console.log(`[PremiseArchitect] Regenerating section: ${section} `)
        result = await agent.regenerateSection(
          section as PremiseSection,
          existingPremise,
          enrichedContext,
          traceId || undefined
        )

        // Parse the result and merge with existing premise
        try {
          const parsed = JSON.parse(result.text)
          const updatedPremise = {
            ...existingPremise,
            ...parsed,
          }

          // Return a response matching the expected format
          return JSON.stringify({
            message: `Regenerated ${section} successfully.`,
            episodePremise: updatedPremise,
            regeneratedSection: section,
            newValue: parsed[section],
            confidence: 0.9,
          })
        } catch (parseError) {
          // If parsing fails, return the raw text
          console.warn('[PremiseArchitect] Failed to parse regenerated section:', parseError)
          return result.text
        }
      } else {
        // Full premise generation
        const fullResult: PremiseGenerationResult = await agent.generatePremise(enrichedContext, projectId, traceId || undefined)
        result = fullResult
      }

      // Emit thinking to UI if present
      if (result.thinking) {
        emitAgentThinking('PremiseArchitect', result.thinking)
      }

      // Log Mazur quality metrics (only for full generation)
      const genResult = result as PremiseGenerationResult
      const qualityInfo = genResult.mazurJudgment
        ? {
          iterations: genResult.iterations,
          finalScore: genResult.finalScore,
          converged: genResult.converged,
          mazur: {
            depth: genResult.mazurJudgment.depth.score,
            structure: genResult.mazurJudgment.structure.score,
            feeling: genResult.mazurJudgment.feeling.score,
            slop: genResult.mazurJudgment.slopScore,
          },
        }
        : { iterations: genResult.iterations || 1 }

      emitConsultEvent('PremiseArchitect', 'complete', {
        hasThinking: !!result.thinking,
        task,
        section,
        ...qualityInfo,
      })

      span.end({
        output: {
          text: result.text.slice(0, 500),
          hasThinking: !!result.thinking,
          ...qualityInfo,
        },
      })

      return result.text
    } catch (error: unknown) {
      span.end({ level: 'ERROR', statusMessage: getErrorMessage(error) })
      throw error
    }
  },
})

/**
 * Consult Consistency Tool
 */
export const consultConsistencyTool = createTool({
  id: 'consult_consistency',
  description:
    'Run a full consistency check on the story. Detects character contradictions, timeline issues, world rule violations, plot logic gaps, and tone inconsistencies. Returns detected issues with proposed fixes.',
  inputSchema: z.object({
    projectId: z.string().describe('Project ID'),
    episodeId: z.string().nullish().describe('Episode ID'),
    context: z.string().describe('Summary of recent story context or the content to check'),
  }),
  execute: async (args: any) => {
    const toolArgs = args
    const traceId = getWorkflowTraceId()

    const span = langfuse.span({
      traceId: traceId || undefined,
      name: 'consult_consistency',
      input: { projectId: toolArgs.projectId },
      metadata: { agentType: 'ConsistencyAgent' },
    })

    emitConsultEvent('ConsistencyAgent', 'start')

    try {
      const [castRows, planRows] = await Promise.all([
        db.select().from(characters).where(eq(characters.projectId, toolArgs.projectId)),
        db.select({ content: storyPlans.content })
          .from(storyPlans).where(eq(storyPlans.projectId, toolArgs.projectId)).limit(1),
      ])

      const plan = (planRows[0]?.content as Record<string, unknown>) || {}

      const storyContext = {
        projectId: toolArgs.projectId,
        episodeId: toolArgs.episodeId || undefined,
        characters: castRows || [],
        beats: Array.isArray(plan.beats) ? plan.beats : [],
        worldRules: Array.isArray(plan.worldRules) ? plan.worldRules : [],
        seriesBible: plan,
      }

      const result = await runConsistencyCheck(storyContext)

      emitConsultEvent('ConsistencyAgent', 'complete', {
        inconsistencies: result.inconsistencies.length,
        fixes: result.fixes.length,
      })

      span.end({
        output: {
          summary: result.summary,
          inconsistencies: result.inconsistencies.length,
          fixes: result.fixes.length,
        },
      })

      return JSON.stringify(result, null, 2)
    } catch (error: unknown) {
      span.end({ level: 'ERROR', statusMessage: getErrorMessage(error) })
      throw error
    }
  },
})

/**
 * Consult Creative Director Tool
 */
export const consultCreativeDirectorTool = createTool({
  id: 'consult_creative_director',
  description:
    'Consult a Creative Director (GRRM or Gilligan style) for creative guidance, content review, or scene direction.',
  inputSchema: z.object({
    task: z.enum(['review_content', 'direct_scene', 'challenge_decision']),
    directorType: z.enum(['grrm', 'gilligan']).default('grrm').describe('Creative Director style'),
    content: z.string().describe('The content/scene/decision to evaluate'),
    context: z.string().optional().describe('Additional story context'),
    projectId: z.string().nullish(),
    episodeId: z.string().nullish(),
  }),
  execute: async (args: any) => {
    const toolArgs = args
    const traceId = getWorkflowTraceId()

    const span = langfuse.span({
      traceId: traceId || undefined,
      name: 'consult_creative_director',
      input: { task: toolArgs.task, directorType: toolArgs.directorType },
      metadata: { agentType: 'CreativeDirector' },
    })

    emitConsultEvent('CreativeDirector', 'start', { task: toolArgs.task, type: toolArgs.directorType })

    try {
      const director = await CreativeDirectorAgent.create(
        toolArgs.directorType || 'grrm',
        'openai:gpt-4o',
        {
          traceId: traceId || undefined,
          projectId: toolArgs.projectId,
          episodeId: toolArgs.episodeId,
        }
      )

      let resultText: string

      switch (toolArgs.task) {
        case 'review_content': {
          const result = await director.reviewContent(
            toolArgs.content,
            toolArgs.context || '',
            'Storyteller',
            traceId || undefined
          )
          resultText = JSON.stringify(result, null, 2)
          break
        }
        case 'direct_scene': {
          const result = await director.directScene(
            toolArgs.content,
            toolArgs.context || '',
            traceId || undefined
          )
          resultText = JSON.stringify(result, null, 2)
          break
        }
        case 'challenge_decision': {
          const result = await director.challengeDecision(
            toolArgs.content,
            toolArgs.context || 'No rationale provided',
            [],
            traceId || undefined
          )
          resultText = JSON.stringify(result, null, 2)
          break
        }
        default:
          resultText = 'Unknown task'
      }

      emitConsultEvent('CreativeDirector', 'complete', { task: toolArgs.task })
      span.end({ output: { preview: resultText.slice(0, 500) } })

      return resultText
    } catch (error: unknown) {
      span.end({ level: 'ERROR', statusMessage: getErrorMessage(error) })
      throw error
    }
  },
})

export const agentTools = [
  consultPsychologistTool,
  consultConsequenceTrackerTool,
  consultDevilsAdvocateTool,
  consultGardenerTool,
  consultPremiseArchitectTool,
  validateReferencesTool,
  consultConsistencyTool,
  consultCreativeDirectorTool,
]
