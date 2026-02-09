import { Workflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import { createPsychologistAgent } from './psychologist-agent'
import { createConsequenceAgent } from './consequence-agent'
import { createGardenerAgent } from './gardener-agent'
import { createDevilsAdvocateAgent } from './devils-advocate-agent'
import { createStorytellerAgent } from './storyteller-agent'
import { langfuse } from '../../../../agent-core/observability'
import { getAgentModelConfig } from './model-config'
import { scoreProseQuality } from '../../guardrails/agent-validators/prose-quality-scorer'

/** Circuit breaker: max refinement passes inside synthesisStep */
const MAX_REFINEMENT_PASSES = 1

/**
 * Story Creation Workflow with Full Langfuse Tracing
 */

// Input Schema
const StoryInputSchema = z.object({
  goal: z.string().describe('The user goal (e.g., "Write a scene where X and Y fight")'),
  narrativeContext: z.string().describe('Current story context (characters, plot, setting)'),
  projectId: z.string(),
  traceId: z.string().optional(),
  episodeId: z.string().optional(),
})

// Import workflow context for event visibility
import {
  getWorkflowEventBus,
  getWorkflowTraceId,
  WORKFLOW_EVENTS,
} from '../../utils/workflow-context'

import { getErrorMessage } from '@/lib/error-utils'

// Helper to emit step events
const emitStepEvent = (step: string, phase: 'start' | 'complete', data?: any) => {
  const bus = getWorkflowEventBus()
  const traceId = getWorkflowTraceId()
  if (bus) {
    if (phase === 'start') {
      bus.emit(WORKFLOW_EVENTS.STEP_START, { step, traceId, ...data })
    } else {
      bus.emit(WORKFLOW_EVENTS.STEP_COMPLETE, { step, traceId, ...data })
    }
  }
}

// Helper for Langfuse spans
const createStepSpan = (stepName: string, agentName: string, input: any) => {
  const traceId = getWorkflowTraceId()
  if (!traceId) return null

  return langfuse.span({
    traceId,
    name: `workflow.${stepName}`,
    input,
    metadata: { agentName, stepType: 'workflow_step' },
  })
}

const psychologyStep = createStep({
  id: 'psychological_analysis',
  inputSchema: StoryInputSchema,
  outputSchema: z.object({ analysis: z.string(), thinking: z.string().optional() }),
  execute: async ({ inputData }) => {
    try {
      const traceId = inputData.traceId || getWorkflowTraceId()
      const span = createStepSpan('psychological_analysis', 'Psychologist', {
        goal: inputData.goal,
      })
      emitStepEvent('Psychological Analysis', 'start', { agent: 'Psychologist' })
      const agent = await createPsychologistAgent(getAgentModelConfig('psychologist').model, {
        traceId: traceId || undefined,
        projectId: inputData.projectId,
        episodeId: inputData.episodeId,
      })
      const result = await agent.analyzeProfile(
        'Unknown',
        `Context: ${inputData.narrativeContext}\nGoal: ${inputData.goal}`,
        traceId || undefined
      )
      emitStepEvent('Psychological Analysis', 'complete', { output: result.text.slice(0, 200) })
      span?.end({ output: { text: result.text.slice(0, 500) } })
      return { analysis: result.text, thinking: result.thinking }
    } catch (error: unknown) {
      throw error
    }
  },
})

const consequenceStep = createStep({
  id: 'consequence_check',
  inputSchema: StoryInputSchema,
  outputSchema: z.object({ validation: z.string(), thinking: z.string().optional() }),
  execute: async ({ inputData }) => {
    try {
      const traceId = inputData.traceId || getWorkflowTraceId()
      const span = createStepSpan('consequence_check', 'ConsequenceTracker', {
        goal: inputData.goal,
      })
      emitStepEvent('Consequence Check', 'start', { agent: 'Consequence Tracker' })
      const agent = await createConsequenceAgent(getAgentModelConfig('consequence').model, {
        traceId: traceId || undefined,
        projectId: inputData.projectId,
        episodeId: inputData.episodeId,
      })
      const result = await agent.checkCausality(
        inputData.goal,
        inputData.narrativeContext,
        traceId || undefined
      )
      emitStepEvent('Consequence Check', 'complete', { output: result.text.slice(0, 200) })
      span?.end({ output: { text: result.text.slice(0, 500) } })
      return { validation: result.text, thinking: result.thinking }
    } catch (error: unknown) {
      throw error
    }
  },
})

const draftingStep = createStep({
  id: 'drafting',
  inputSchema: z.any(),
  outputSchema: z.object({ draft: z.string(), thinking: z.string().optional() }),
  execute: async (params: any) => {
    try {
      const { getInitData, getStepResult } = params
      const input = getInitData()

      const traceId = input?.traceId || getWorkflowTraceId()
      const span = createStepSpan('drafting', 'Gardener', { goal: input?.goal })
      emitStepEvent('Drafting', 'start', { agent: 'The Gardener' })

      const agent = await createGardenerAgent(getAgentModelConfig('gardener-standard').model, {
        traceId: traceId || undefined,
        projectId: input?.projectId,
        episodeId: input?.episodeId,
      })
      const psychologyRes = getStepResult('psychological_analysis')
      const logicRes = getStepResult('consequence_check')

      const psychology = psychologyRes?.analysis || 'No analysis'
      const logic = logicRes?.validation || 'No validation'

      const augmentedContext = `Context: ${input?.narrativeContext}\nPsychology: ${psychology}\nLogic: ${logic}`
      const result = await agent.writeScene(input?.goal, augmentedContext, traceId || undefined)
      emitStepEvent('Drafting', 'complete', { output: result.text.slice(0, 200) })
      span?.end({ output: { text: result.text.slice(0, 500) } })
      return { draft: result.text, thinking: result.thinking }
    } catch (error: unknown) {
      throw error
    }
  },
})

const critiqueStep = createStep({
  id: 'critique',
  inputSchema: z.any(),
  outputSchema: z.object({ critique: z.string(), thinking: z.string().optional() }),
  execute: async (params: any) => {
    try {
      const { getInitData, getStepResult } = params
      const input = getInitData()
      const traceId = input?.traceId || getWorkflowTraceId()
      const draftRes = getStepResult('drafting')
      const draft = draftRes?.draft || ''
      const span = createStepSpan('critique', 'DevilsAdvocate', {
        draftPreview: draft.slice(0, 100),
      })
      emitStepEvent('Critique', 'start', { agent: "Devil's Advocate" })
      const agent = await createDevilsAdvocateAgent(getAgentModelConfig('devils-advocate').model, {
        traceId: traceId || undefined,
        projectId: input?.projectId,
      })
      const result = await agent.critique(draft, input?.narrativeContext, traceId || undefined)
      emitStepEvent('Critique', 'complete', { output: result.text.slice(0, 200) })
      span?.end({ output: { text: result.text.slice(0, 500) } })
      return { critique: result.text, thinking: result.thinking }
    } catch (error: unknown) {
      throw error
    }
  },
})

const creativeDecisionStep = createStep({
  id: 'creative_decision',
  inputSchema: z.any(),
  outputSchema: z.object({
    approved: z.boolean(),
    direction: z.string(),
    critiqueScore: z.number(),
    proseScore: z.number(),
    refinementFocus: z.string().optional(),
  }),
  execute: async (params: any) => {
    try {
      const { getStepResult } = params
      const critiqueRes = getStepResult('critique')
      const draftRes = getStepResult('drafting')
      const draft = draftRes?.draft || ''
      const critiqueText = critiqueRes?.critique || ''

      // Score prose quality locally (no LLM call)
      const proseResult = scoreProseQuality(draft)

      // Parse critique JSON for structured score (if Devil's Advocate returned JSON)
      let critiqueScore = 0.7 // default if unparseable
      try {
        const parsed = JSON.parse(critiqueText)
        if (parsed.overallScore !== undefined) critiqueScore = parsed.overallScore
        else if (parsed.assessment === 'PASS') critiqueScore = 0.85
        else if (parsed.assessment === 'CHALLENGE') critiqueScore = 0.5
      } catch {
        // Critique wasn't JSON, estimate from keywords
        const hasPass = /\bPASS\b/i.test(critiqueText)
        critiqueScore = hasPass ? 0.85 : 0.6
      }

      const proseOk = proseResult.score >= 0.6
      const critiqueOk = critiqueScore >= 0.7

      const approved = proseOk && critiqueOk
      const refinementFocus = !proseOk
        ? `Prose quality issues: ${proseResult.flags
          .slice(0, 3)
          .map(f => f.match)
          .join(', ')}`
        : !critiqueOk
          ? `Critique concerns: ${critiqueText.slice(0, 200)}`
          : undefined

      emitStepEvent('Creative Decision', 'complete', {
        approved,
        proseScore: proseResult.score,
        critiqueScore,
      })

      return {
        approved,
        direction: approved ? 'proceed' : 'refine',
        critiqueScore,
        proseScore: proseResult.score,
        refinementFocus,
      }
    } catch {
      return { approved: true, direction: 'proceed', critiqueScore: 0.7, proseScore: 0.7 }
    }
  },
})

const synthesisStep = createStep({
  id: 'synthesis',
  inputSchema: z.any(),
  outputSchema: z.object({ finalOutput: z.string() }),
  execute: async (params: any) => {
    try {
      const { getInitData, getStepResult } = params
      const input = getInitData()
      const traceId = input?.traceId || getWorkflowTraceId()
      const span = createStepSpan('synthesis', 'Storyteller', { goal: input?.goal })
      emitStepEvent('Final Synthesis', 'start', { agent: 'Storyteller' })

      const agent = await createStorytellerAgent(getAgentModelConfig('storyteller').model)
      const draftRes = getStepResult('drafting')
      const critiqueRes = getStepResult('critique')
      const decisionRes = getStepResult('creative_decision')
      let draft = draftRes?.draft || ''
      const critique = critiqueRes?.critique || ''

      // === REFINEMENT LOOP (circuit breaker: MAX_REFINEMENT_PASSES) ===
      if (decisionRes && !decisionRes.approved) {
        const refinementFocus = decisionRes.refinementFocus || 'Address the critique feedback'
        emitStepEvent('Refinement', 'start', { pass: 1, focus: refinementFocus })

        try {
          const gardener = await createGardenerAgent(
            getAgentModelConfig('gardener-refinement').model,
            {
              traceId: traceId || undefined,
              projectId: input?.projectId,
              episodeId: input?.episodeId,
            }
          )
          const refined = await gardener.writeScene(
            `REVISE this draft based on specific feedback:\n\nORIGINAL DRAFT:\n${draft}\n\nFEEDBACK TO ADDRESS:\n${refinementFocus}\n\nCRITIQUE:\n${critique}\n\nFix the specific issues raised. Keep what works.`,
            input?.narrativeContext || '',
            traceId || undefined
          )
          draft = refined.text
          emitStepEvent('Refinement', 'complete', { pass: 1, improved: true })
        } catch (error: unknown) {
          emitStepEvent('Refinement', 'complete', {
            pass: 1,
            improved: false,
            error: getErrorMessage(error),
          })
          // Use original draft if refinement fails
        }
      }

      const isStructural =
        input?.goal?.toLowerCase().includes('rule') ||
        input?.goal?.toLowerCase().includes('lore') ||
        input?.goal?.toLowerCase().includes('bible')

      if (isStructural) {
        // Nuclear Option: Remove all other tools to prevent cinematic drift
        // @ts-ignore - access internal agent tools
        const worldTool = agent.toolsMap['update_world_bible']
        if (worldTool) {
          // @ts-ignore
          agent.agent.tools = { update_world_bible: worldTool }
        }
      }

      const prompt = `
### GENIUS MODE ENABLED (IQ 200)
Synthesize the council inputs with the ruthless realism of George R. R. Martin and the "out of the box" narrative complexity of Vince Gilligan.

### CRITICAL: OBEY THE GOAL
GOAL: ${input?.goal}

${isStructural
          ? `
WARNING: This is a STRUCTURAL goal. 
1. YOU MUST call 'update_world_bible' with the fields requested in the GOAL.
2. Put the rules in the 'worldRules' array.
`
          : ''
        }

### Council Inputs
Draft: "${draft}"
Critique: "${critique}"

### FINAL INSTRUCTION
1. Accomplish the GOAL: "${input?.goal}"
2. Deliver an IQ 200 "out of the box" solution that surprises and enthralls.
3. If lore/rules are involved, YOU MUST CALL 'update_world_bible' AND INCLUDE AN 'UPDATE_SERIES_BIBLE' ACTION.
4. World Rules MUST be valid: { "category": "Physics|Magic|Technology|Society|Politics|Economics", "rule": "...", "consequence": "..." }
5. Use projectId: ${input?.projectId}
            `
      const toolChoice = isStructural ? { type: 'tool', toolName: 'update_world_bible' } : 'auto'
      const response = await agent.run(
        input?.goal,
        prompt,
        input?.traceId || undefined,
        toolChoice as any
      )
      emitStepEvent('Final Synthesis', 'complete', { output: response.slice(0, 200) })
      span?.end({ output: { text: response.slice(0, 500) } })
      return { finalOutput: response }
    } catch (error: unknown) {
      throw error
    }
  },
})

export const storyCreationWorkflow = new Workflow({
  id: 'story-creation-pipeline',
  inputSchema: StoryInputSchema,
  outputSchema: z.object({ finalOutput: z.string() }),
})
  .parallel([psychologyStep, consequenceStep])
  .then(draftingStep)
  .then(critiqueStep)
  .then(creativeDecisionStep)
  .then(synthesisStep)
  .commit()

class StoryCreationWorkflow extends Workflow {
  constructor() {
    super({
      id: 'story-creation-pipeline',
      inputSchema: StoryInputSchema,
      outputSchema: z.object({ finalOutput: z.string() }),
    } as any)
  }
}
