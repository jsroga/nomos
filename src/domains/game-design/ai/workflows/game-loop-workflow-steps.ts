import { createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import {
  createAnalyzeMechanicBalanceTool,
  createValidateLoopStructureTool,
  type GameDesignAgent,
} from '@/domains/game-design'
import { GameMechanicSchema } from '@/domains/game-design/core/schemas'
import { LoopProposalSchema, parseLoopProposal } from '../constants/loop-proposal'
import {
  BalanceIssueSeverity,
  DEFAULT_SESSION_DURATION_MINUTES,
  GameLoopWorkflowCopy,
  GameLoopWorkflowStatus,
  GameLoopWorkflowStepId,
} from '../constants/game-loop-workflow-wire'
import {
  BalanceAnalysisResultSchema,
  BalanceCheckOutputSchema,
  HumanReviewOutputSchema,
  HumanReviewResumeSchema,
  IdeationOutputSchema,
  RefinementOutputSchema,
  StructureCheckOutputSchema,
  StructureValidationResultSchema,
  WorkflowInputSchema,
  WorkflowOutputSchema,
  type BalanceIssue,
} from './game-loop-workflow-schemas'
import {
  buildValidatedLoop,
  extractLoopProposalFromResponse,
  invokeWorkflowTool,
  isBalanceSuccess,
  mergeLoopModifications,
  refineLoopFromFeedback,
  type StructureValidationIssue,
} from './game-loop-workflow-helpers'
import { db } from '@/db/client'
import { gameLoops } from '@/db/schema'
import { getErrorMessage } from '@/shared/errors/error-utils'

export function createIdeationStep(agent: GameDesignAgent) {
  return createStep({
    id: GameLoopWorkflowStepId.Ideation,
    inputSchema: WorkflowInputSchema,
    outputSchema: IdeationOutputSchema,
    execute: async ({ inputData }) => {
      const { genre, loopType, targetAudience, theme, referenceGames } = inputData
      const result = await agent.designLoop({
        genre,
        targetAudience,
        theme,
        loopType,
        referenceGames,
      })

      return {
        ...inputData,
        loopProposal: extractLoopProposalFromResponse(result),
        thought: result.thought,
        iterationCount: 0,
      }
    },
  })
}

export function createBalanceCheckStep() {
  return createStep({
    id: GameLoopWorkflowStepId.BalanceCheck,
    inputSchema: IdeationOutputSchema,
    outputSchema: BalanceCheckOutputSchema,
    execute: async ({ inputData }) => {
      const loopProposal = parseLoopProposal(inputData.loopProposal)
      const analyzeTool = createAnalyzeMechanicBalanceTool()
      const mechanicsToAnalyze = loopProposal?.mechanics ?? []

      if (mechanicsToAnalyze.length === 0) {
        return {
          ...inputData,
          balanceAnalysis: null,
          passesValidation: true,
          issues: [GameLoopWorkflowCopy.NoMechanicsToAnalyze],
        }
      }

      const parsedMechanics = z.array(GameMechanicSchema).safeParse(mechanicsToAnalyze)
      if (!parsedMechanics.success) {
        return {
          ...inputData,
          balanceAnalysis: null,
          passesValidation: false,
          issues: [GameLoopWorkflowCopy.MechanicsSchemaFailed],
        }
      }

      const result = await invokeWorkflowTool(analyzeTool, {
        loopId: loopProposal?.id ?? crypto.randomUUID(),
        mechanics: parsedMechanics.data,
        resources: loopProposal?.resources ?? [],
        targetAudience: inputData.targetAudience,
        sessionDurationMinutes: DEFAULT_SESSION_DURATION_MINUTES,
      })

      const parsedResult = BalanceAnalysisResultSchema.safeParse(result)
      if (!parsedResult.success) {
        return {
          ...inputData,
          balanceAnalysis: null,
          passesValidation: false,
          issues: [GameLoopWorkflowCopy.BalanceInvalidPayload],
        }
      }

      if (!parsedResult.data.success) {
        return {
          ...inputData,
          balanceAnalysis: parsedResult.data,
          passesValidation: false,
          issues: [parsedResult.data.error],
        }
      }

      const criticalIssues = parsedResult.data.issues.filter(
        (issue: BalanceIssue) => issue.severity === BalanceIssueSeverity.Critical
      )

      return {
        ...inputData,
        balanceAnalysis: parsedResult.data,
        passesValidation: criticalIssues.length === 0,
        issues: parsedResult.data.issues.map((issue: BalanceIssue) => issue.description),
      }
    },
  })
}

export function createStructureValidationStep() {
  return createStep({
    id: GameLoopWorkflowStepId.StructureValidation,
    inputSchema: BalanceCheckOutputSchema,
    outputSchema: StructureCheckOutputSchema,
    execute: async ({ inputData }) => {
      const loopProposal = parseLoopProposal(inputData.loopProposal)
      const validateTool = createValidateLoopStructureTool()

      if (!loopProposal?.nodes || loopProposal.nodes.length === 0) {
        return {
          ...inputData,
          structureValidation: {
            isValid: true,
            structureIssues: [GameLoopWorkflowCopy.NoLoopStructure],
            metrics: { nodeCount: 0, edgeCount: 0, cycleDetected: false },
          },
        }
      }

      const parsedMechanics = z.array(GameMechanicSchema).safeParse(loopProposal.mechanics ?? [])
      if (!parsedMechanics.success) {
        return {
          ...inputData,
          structureValidation: {
            isValid: false,
            structureIssues: [GameLoopWorkflowCopy.LoopMechanicsSchemaFailed],
            metrics: null,
          },
        }
      }

      const result = await invokeWorkflowTool(validateTool, {
        loop: buildValidatedLoop(loopProposal),
        mechanics: parsedMechanics.data,
      })

      if (!result.success) {
        return {
          ...inputData,
          structureValidation: {
            isValid: false,
            structureIssues: [result.error ?? GameLoopWorkflowCopy.StructureValidationFailed],
            metrics: null,
          },
        }
      }

      return {
        ...inputData,
        structureValidation: {
          isValid: result.isValid,
          structureIssues: result.issues.map((issue: StructureValidationIssue) => issue.description),
          metrics: result.metrics,
        },
      }
    },
  })
}

export function createHumanReviewStep() {
  return createStep({
    id: GameLoopWorkflowStepId.HumanReview,
    inputSchema: StructureCheckOutputSchema,
    suspendSchema: z.object({
      reason: z.string(),
      loopProposal: LoopProposalSchema.optional(),
      balanceAnalysis: BalanceAnalysisResultSchema.optional(),
      structureValidation: StructureValidationResultSchema,
    }),
    resumeSchema: HumanReviewResumeSchema,
    outputSchema: HumanReviewOutputSchema,
    execute: async ({ inputData, resumeData, suspend }) => {
      if (resumeData) {
        return {
          ...inputData,
          approved: resumeData.approved,
          feedback: resumeData.feedback,
          modifications: resumeData.modifications,
        }
      }

      return await suspend({
        reason: GameLoopWorkflowCopy.AwaitingHumanReview,
        loopProposal: inputData.loopProposal,
        balanceAnalysis: inputData.balanceAnalysis ?? undefined,
        structureValidation: inputData.structureValidation,
      })
    },
  })
}

export function createRefinementStep(agent: GameDesignAgent, maxIterations: number) {
  return createStep({
    id: GameLoopWorkflowStepId.Refinement,
    inputSchema: HumanReviewOutputSchema,
    outputSchema: RefinementOutputSchema,
    execute: async ({ inputData }) => {
      const loopProposal = parseLoopProposal(inputData.loopProposal)
      const iterationCount = inputData.iterationCount

      if (iterationCount >= maxIterations) {
        return {
          ...inputData,
          refinedLoop: loopProposal,
          reachedLimit: true,
        }
      }

      if (inputData.modifications) {
        return {
          ...inputData,
          refinedLoop: mergeLoopModifications(loopProposal, inputData.modifications),
          iterationCount: iterationCount + 1,
          reachedLimit: false,
        }
      }

      if (inputData.feedback) {
        const refinedLoop = await refineLoopFromFeedback(agent, loopProposal, inputData.feedback)
        return {
          ...inputData,
          refinedLoop,
          iterationCount: iterationCount + 1,
          reachedLimit: false,
        }
      }

      return {
        ...inputData,
        refinedLoop: loopProposal,
        reachedLimit: false,
      }
    },
  })
}

export function createFinalizationStep() {
  return createStep({
    id: GameLoopWorkflowStepId.Finalization,
    inputSchema: RefinementOutputSchema,
    outputSchema: WorkflowOutputSchema,
    execute: async ({ inputData }) => {
      const refinedLoop =
        parseLoopProposal(inputData.refinedLoop) ?? parseLoopProposal(inputData.loopProposal)
      const balanceAnalysis = BalanceAnalysisResultSchema.optional().safeParse(inputData.balanceAnalysis)
        .success
        ? BalanceAnalysisResultSchema.parse(inputData.balanceAnalysis)
        : undefined

      try {
        if (!refinedLoop?.nodes) {
          return {
            status: GameLoopWorkflowStatus.Failed,
            message: GameLoopWorkflowCopy.NoValidLoopStructure,
          }
        }

        const [savedLoop] = await db
          .insert(gameLoops)
          .values({
            projectId: inputData.projectId,
            userId: GameLoopWorkflowCopy.SystemUserId,
            name: refinedLoop.name ?? GameLoopWorkflowCopy.UntitledLoop,
            nodes: refinedLoop.nodes,
            edges: refinedLoop.edges ?? [],
            metadata: {
              type: refinedLoop.type ?? inputData.loopType,
              resources: refinedLoop.resources,
              metrics: refinedLoop.metrics,
              genre: inputData.genre,
              targetAudience: inputData.targetAudience,
            },
            analysis: isBalanceSuccess(balanceAnalysis) ? balanceAnalysis : null,
          })
          .returning()

        return {
          loopId: savedLoop.id,
          loop: refinedLoop,
          balanceAnalysis,
          status: GameLoopWorkflowStatus.Completed,
          message: `Game loop "${refinedLoop.name ?? GameLoopWorkflowCopy.Untitled}" created successfully`,
        }
      } catch (error: unknown) {
        return {
          status: GameLoopWorkflowStatus.Failed,
          message: `Failed to save loop: ${getErrorMessage(error)}`,
        }
      }
    },
  })
}
