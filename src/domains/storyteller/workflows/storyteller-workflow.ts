/**
 * StorytellerWorkflow - Multi-step Story Development Flow
 *
 * Simplified workflow using StorytellerAgent directly.
 * Steps: ideation → continuity check → refinement → finalization
 *
 * For human-in-the-loop, the calling code should pause between steps.
 */

import { createStorytellerAgent, StorytellerAgent } from '../agents/v2'
import { checkContinuityTool, manageBeatTool } from '../tools/v2'
import { getErrorMessage } from '@/lib/error-utils'

// ==========================================
// TYPES
// ==========================================

export interface StoryBeat {
  logline?: string
  content?: string
  charactersInvolved?: string[]
  visualHook?: string
  beatType?: string
  [key: string]: unknown
}

export interface ContinuityIssue {
  severity: 'critical' | 'warning' | 'info'
  message?: string
  [key: string]: unknown
}

export type StoryCharacter = string | { name: string; [key: string]: unknown }

export interface StorytellerWorkflowInput {
  episodeId: string
  seriesBible?: Record<string, unknown>
  existingBeats?: StoryBeat[]
  characters?: StoryCharacter[]
  storyContext?: string
  targetEmotion?: string
}

export interface WorkflowStepResult {
  step: string
  success: boolean
  data: unknown
  error?: string
}

export interface StorytellerWorkflowOutput {
  beats: StoryBeat[]
  continuityIssues: ContinuityIssue[]
  status: 'completed' | 'needs_review' | 'failed'
  message: string
  steps: WorkflowStepResult[]
}

// ==========================================
// WORKFLOW STEPS
// ==========================================

async function runIdeationStep(
  agent: StorytellerAgent,
  input: StorytellerWorkflowInput,
  traceId?: string
): Promise<WorkflowStepResult> {
  const { episodeId, storyContext, targetEmotion, characters = [], existingBeats = [] } = input

  const characterNames = characters
    .map((c) => (typeof c === 'string' ? c : c.name))
    .filter(Boolean)
  const lastBeat = existingBeats[existingBeats.length - 1]
  const previousBeatSummary = lastBeat?.logline || lastBeat?.content || ''

  try {
    const result = await agent.generateBeat(
      {
        episodeId,
        previousBeat: previousBeatSummary,
        targetEmotion,
        characters: characterNames,
      },
      traceId
    )

    let proposedBeat
    try {
      proposedBeat = JSON.parse(result)
    } catch {
      proposedBeat = {
        logline: result.slice(0, 200),
        content: result,
        charactersInvolved: characterNames,
      }
    }

    return {
      step: 'ideation',
      success: true,
      data: { proposedBeat },
    }
  } catch (error: unknown) {
    return {
      step: 'ideation',
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

async function runContinuityStep(
  proposedBeat: StoryBeat,
  input: StorytellerWorkflowInput,
  traceId?: string
): Promise<WorkflowStepResult> {
  const { existingBeats = [], seriesBible = {}, characters = [] } = input

  try {
    const beatsToCheck = [...existingBeats, proposedBeat]

    // checkContinuityTool is called directly, tracing handled by wrapping or internal logic if added later.
    const result = await checkContinuityTool.execute({
      context: {
        scope: 'all_beats',
        checkTypes: ['world_rules', 'character_knowledge', 'setup_payoff'],
        autoFix: false,
        beatBoard: beatsToCheck,
        currentBeat: proposedBeat,
        characters,
        seriesBible,
        unresolvedSetups: [],
      },
      runtimeContext: {} as any,
    })

    const parsed = typeof result === 'string' ? JSON.parse(result) : result
    const hasCritical = (parsed.issues || []).some(
      (i: ContinuityIssue) => i.severity === 'critical'
    )

    return {
      step: 'continuity_check',
      success: true,
      data: {
        passesValidation: !hasCritical,
        issues: parsed.issues || [],
        summary: parsed.summary || {},
      },
    }
  } catch (error: unknown) {
    return {
      step: 'continuity_check',
      success: false,
      data: { passesValidation: true, issues: [] },
      error: getErrorMessage(error),
    }
  }
}

async function runRefinementStep(
  agent: StorytellerAgent,
  proposedBeat: StoryBeat,
  feedback?: string,
  modifications?: Record<string, unknown>,
  traceId?: string
): Promise<WorkflowStepResult> {
  try {
    // Apply direct modifications if provided
    if (modifications) {
      return {
        step: 'refinement',
        success: true,
        data: { refinedBeat: { ...proposedBeat, ...modifications } },
      }
    }

    // Use agent to refine based on feedback
    if (feedback) {
      const result = await agent.run(
        `Refine the following story beat based on user feedback: ${feedback}`,
        `Current beat: ${JSON.stringify(proposedBeat)}`,
        traceId
      )

      let refinedBeat
      try {
        refinedBeat = JSON.parse(result)
      } catch {
        refinedBeat = { ...proposedBeat, content: result }
      }

      return {
        step: 'refinement',
        success: true,
        data: { refinedBeat },
      }
    }

    // No refinement needed
    return {
      step: 'refinement',
      success: true,
      data: { refinedBeat: proposedBeat },
    }
  } catch (error: unknown) {
    return {
      step: 'refinement',
      success: false,
      data: { refinedBeat: proposedBeat },
      error: getErrorMessage(error),
    }
  }
}

async function runFinalizationStep(
  beat: StoryBeat,
  input: StorytellerWorkflowInput
): Promise<WorkflowStepResult> {
  const { episodeId, existingBeats = [] } = input

  try {
    const result = await manageBeatTool.execute({
      context: {
        operation: 'create',
        data: {
          logline: beat.logline || '',
          content: beat.content || '',
          charactersInvolved: beat.charactersInvolved || [],
          visualHook: beat.visualHook || '',
          beatType: beat.beatType || 'setup',
        },
        targetPosition: existingBeats.length,
        episodeId,
        beatBoard: existingBeats,
      },
      runtimeContext: {} as any,
    })

    const parsed = typeof result === 'string' ? JSON.parse(result) : result

    return {
      step: 'finalization',
      success: parsed.success !== false,
      data: { beat: parsed.beat || beat },
    }
  } catch (error: unknown) {
    return {
      step: 'finalization',
      success: false,
      data: { beat },
      error: getErrorMessage(error),
    }
  }
}

// ==========================================
// MAIN WORKFLOW RUNNER
// ==========================================

export async function runStorytellerWorkflow(
  input: StorytellerWorkflowInput,
  options: {
    modelName?: string
    feedback?: string
    modifications?: Record<string, unknown>
    skipContinuityCheck?: boolean
    traceId?: string
  } = {}
): Promise<StorytellerWorkflowOutput> {
  const steps: WorkflowStepResult[] = []
  const {
    modelName = 'openai:gpt-4o',
    feedback,
    modifications,
    skipContinuityCheck,
    traceId,
  } = options

  // Initialize agent
  const agent = await createStorytellerAgent(modelName)

  // Step 1: Ideation
  const ideationResult = await runIdeationStep(agent, input, traceId)
  steps.push(ideationResult)

  if (!ideationResult.success) {
    return {
      beats: [],
      continuityIssues: [],
      status: 'failed',
      message: `Ideation failed: ${ideationResult.error}`,
      steps,
    }
  }

  const ideationData = ideationResult.data as { proposedBeat: StoryBeat }
  let proposedBeat = ideationData.proposedBeat
  let continuityIssues: ContinuityIssue[] = []

  // Step 2: Continuity Check (optional)
  if (!skipContinuityCheck) {
    const continuityResult = await runContinuityStep(proposedBeat, input, traceId)
    steps.push(continuityResult)
    const contData = continuityResult.data as {
      passesValidation: boolean
      issues: ContinuityIssue[]
    }
    continuityIssues = contData.issues || []

    if (!contData.passesValidation) {
      return {
        beats: [proposedBeat],
        continuityIssues,
        status: 'needs_review',
        message: 'Beat has critical continuity issues - review required',
        steps,
      }
    }
  }

  // Step 3: Refinement (if feedback provided)
  if (feedback || modifications) {
    const refinementResult = await runRefinementStep(
      agent,
      proposedBeat,
      feedback,
      modifications,
      traceId
    )
    steps.push(refinementResult)

    if (refinementResult.success) {
      proposedBeat = (refinementResult.data as { refinedBeat: StoryBeat }).refinedBeat
    }
  }

  // Step 4: Finalization
  const finalizationResult = await runFinalizationStep(proposedBeat, input)
  steps.push(finalizationResult)

  if (!finalizationResult.success) {
    return {
      beats: [proposedBeat],
      continuityIssues,
      status: 'failed',
      message: `Finalization failed: ${finalizationResult.error}`,
      steps,
    }
  }

  return {
    beats: [(finalizationResult.data as { beat: StoryBeat }).beat],
    continuityIssues,
    status: 'completed',
    message: `Beat created successfully for episode ${input.episodeId}`,
    steps,
  }
}

// ==========================================
// CONVENIENCE EXPORTS
// ==========================================

export { createStorytellerAgent }
