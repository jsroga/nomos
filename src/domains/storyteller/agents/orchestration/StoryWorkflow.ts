import { Workflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import { createPsychologistAgent } from '@/domains/storyteller/agents/council/PsychologistAgent'
import { createConsequenceAgent } from '@/domains/storyteller/agents/council/ConsequenceAgent'
import { createGardenerAgent } from '@/domains/storyteller/agents/council/GardenerAgent'
import { createDevilsAdvocateAgent } from '@/domains/storyteller/agents/council/DevilsAdvocateAgent'
import { createStorytellerAgent } from '@/domains/storyteller/agents/StorytellerAgent'
import { langfuse } from '@/agent-core/observability'
import { getAgentModelConfig } from '@/domains/storyteller/config/ModelConfig'
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
} from '@/domains/storyteller/agents/orchestration/WorkflowContext'

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
  },
})

const consequenceStep = createStep({
  id: 'consequence_check',
  inputSchema: StoryInputSchema,
  outputSchema: z.object({ validation: z.string(), thinking: z.string().optional() }),
  execute: async ({ inputData }) => {
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
  },
})

const draftingStep = createStep({
  id: 'drafting',
  inputSchema: z.any(),
  outputSchema: z.object({ draft: z.string(), thinking: z.string().optional() }),
  execute: async (params: any) => {
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
  },
})

const critiqueStep = createStep({
  id: 'critique',
  inputSchema: z.any(),
  outputSchema: z.object({ critique: z.string(), thinking: z.string().optional() }),
  execute: async (params: any) => {
    const { getInitData, getStepResult } = params
    const input = getInitData()
    const traceId = input?.traceId || getWorkflowTraceId()
    const draftRes = getStepResult('drafting')
    const draft = draftRes?.draft || ''
    const span = createStepSpan('critique', 'DevilsAdvocate', {
      draftPreview: draft.slice(0, 100),
    })
    emitStepEvent('Critique', 'start', { agent: 'Devil\'s Advocate' })
    const agent = await createDevilsAdvocateAgent(getAgentModelConfig('devils-advocate').model, {
      traceId: traceId || undefined,
      projectId: input?.projectId,
    })
    const result = await agent.critique(draft, input?.narrativeContext, traceId || undefined)
    emitStepEvent('Critique', 'complete', { output: result.text.slice(0, 200) })
    span?.end({ output: { text: result.text.slice(0, 500) } })
    return { critique: result.text, thinking: result.thinking }
  },
})

const creativeDecisionStep = createStep({
  id: 'creative_decision',
  inputSchema: z.any(),
  outputSchema: z.object({
    approved: z.boolean(),
    direction: z.string(),
    critiqueScore: z.number(),
    refinementFocus: z.string().optional(),
  }),
  execute: async (params: any) => {
    try {
      const { getStepResult } = params
      const critiqueRes = getStepResult('critique')
      const critiqueText = critiqueRes?.critique || ''

      // Quality is judged by the LLM critique (Devil's Advocate), not regex.
      // Parse the structured critique score; fall back to a PASS token if not JSON.
      let critiqueScore = 0.7 // default if unparseable
      try {
        const parsed = JSON.parse(critiqueText)
        if (parsed.overallScore !== undefined) critiqueScore = parsed.overallScore
        else if (parsed.assessment === 'PASS') critiqueScore = 0.85
        else if (parsed.assessment === 'CHALLENGE') critiqueScore = 0.5
      } catch {
        critiqueScore = /\bPASS\b/i.test(critiqueText) ? 0.85 : 0.6
      }

      const approved = critiqueScore >= 0.7
      const refinementFocus = approved
        ? undefined
        : `Critique concerns: ${critiqueText.slice(0, 200)}`

      emitStepEvent('Creative Decision', 'complete', { approved, critiqueScore })

      return {
        approved,
        direction: approved ? 'proceed' : 'refine',
        critiqueScore,
        refinementFocus,
      }
    } catch (error) {
      // If quality gate fails, default to REJECT — don't let broken critiques auto-approve
      console.warn('[CreativeDecision] Quality gate error, defaulting to refine:', error)
      return { approved: false, direction: 'refine', critiqueScore: 0.5, refinementFocus: 'Quality gate failed — critique could not be parsed. Refine for safety.' }
    }
  },
})

const synthesisStep = createStep({
  id: 'synthesis',
  inputSchema: z.any(),
  outputSchema: z.object({ finalOutput: z.string() }),
  execute: async (params: any) => {
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
        } catch (err: unknown) {
          emitStepEvent('Refinement', 'complete', {
            pass: 1,
            improved: false,
            error: getErrorMessage(err),
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
      // @ts-expect-error - access internal agent tools
      const worldTool = agent.toolsMap['update_world_bible']
      if (worldTool) {
        // @ts-expect-error - mutating internal agent tools
        agent.agent.tools = { update_world_bible: worldTool }
      }
    }

    const prompt = `
### SYNTHESIS STEP
Combine the council inputs into final output. Apply your writing constraints: show don't tell, specific over generic, consequences for every action.

### GOAL
${input?.goal}

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

### INSTRUCTIONS
1. Accomplish the GOAL: "${input?.goal}"
2. Every sentence must be specific to THIS story — cut anything generic.
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
