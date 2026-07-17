import { createWorkflow } from '@mastra/core/workflows'
import type { GameDesignAgent } from '@/domains/game-design'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  GameLoopWorkflowCopy,
  GameLoopWorkflowRunStatus,
  GameLoopWorkflowStatus,
  GameLoopWorkflowStepId,
} from '../constants/game-loop-workflow-wire'
import {
  GAME_LOOP_WORKFLOW_ID,
  WorkflowInputSchema,
  WorkflowOutputSchema,
  type LoopModifications,
  type WorkflowInput,
  type WorkflowOutput,
} from './game-loop-workflow-schemas'
import {
  createBalanceCheckStep,
  createFinalizationStep,
  createHumanReviewStep,
  createIdeationStep,
  createRefinementStep,
  createStructureValidationStep,
} from './game-loop-workflow-steps'

export { GAME_LOOP_WORKFLOW_ID } from './game-loop-workflow-schemas'
export type { WorkflowInput, WorkflowOutput } from './game-loop-workflow-schemas'

export function createGameLoopWorkflowGraph(agent: GameDesignAgent, maxIterations = 3) {
  return createWorkflow({
    id: GAME_LOOP_WORKFLOW_ID,
    description: GameLoopWorkflowCopy.Description,
    inputSchema: WorkflowInputSchema,
    outputSchema: WorkflowOutputSchema,
  })
    .then(createIdeationStep(agent))
    .then(createBalanceCheckStep())
    .then(createStructureValidationStep())
    .then(createHumanReviewStep())
    .then(createRefinementStep(agent, maxIterations))
    .then(createFinalizationStep())
    .commit()
}

export class GameLoopWorkflow {
  private readonly workflow: ReturnType<typeof createGameLoopWorkflowGraph>

  constructor(agent: GameDesignAgent) {
    this.workflow = createGameLoopWorkflowGraph(agent)
  }

  async run(input: WorkflowInput): Promise<WorkflowOutput> {
    const validatedInput = WorkflowInputSchema.parse(input)
    const run = await this.workflow.createRun()
    const result = await run.start({ inputData: validatedInput })

    if (result.status === GameLoopWorkflowRunStatus.Failed) {
      return {
        status: GameLoopWorkflowStatus.Failed,
        message: getErrorMessage(result.error),
      }
    }

    if (result.status === GameLoopWorkflowRunStatus.Suspended) {
      return {
        status: GameLoopWorkflowStatus.NeedsReview,
        message: GameLoopWorkflowCopy.WorkflowSuspended,
      }
    }

    if (result.status !== GameLoopWorkflowRunStatus.Success) {
      return {
        status: GameLoopWorkflowStatus.Failed,
        message: `Workflow ended with status: ${result.status}`,
      }
    }

    return WorkflowOutputSchema.parse(result.result)
  }

  async resumeWithFeedback(
    runId: string,
    feedback: {
      approved: boolean
      feedback?: string
      modifications?: LoopModifications
    }
  ) {
    const run = await this.workflow.createRun({ runId })
    return run.resume({
      step: GameLoopWorkflowStepId.HumanReview,
      resumeData: feedback,
    })
  }
}

export async function createGameLoopWorkflow(agentConfig: {
  modelName: string
  connectionString?: string
}): Promise<{ workflow: GameLoopWorkflow }> {
  const { GameDesignAgent, createGameDesignMemory } = await import('@/domains/game-design')

  const memory = agentConfig.connectionString
    ? createGameDesignMemory(agentConfig.connectionString)
    : undefined

  const persistence = {
    async loadPlan() {
      return null
    },
    async savePlan() {
      // No-op for now
    },
  }

  const agent = await GameDesignAgent.create({
    modelName: agentConfig.modelName,
    persistence,
    memory,
  })

  return { workflow: new GameLoopWorkflow(agent) }
}
