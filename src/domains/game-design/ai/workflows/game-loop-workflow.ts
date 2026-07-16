import { createWorkflow, createStep } from '@mastra/core/workflows'
import {
  isValidationError,
  noopObserve,
  type ToolExecutionContext,
  type ValidationError,
} from '@mastra/core/tools'
import { z } from 'zod'
import {
  GameDesignAgent,
  createAnalyzeMechanicBalanceTool,
  createValidateLoopStructureTool,
} from '@/domains/game-design'
import {
  AnalyzeBalanceOutputSchema,
  GameLoopSchema,
  GameMechanicSchema,
} from '@/domains/game-design/core/schemas'
import { db } from '@/db/client'
import { gameLoops } from '@/db/schema'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { GameDesignResponseType } from '../constants/game-design-response'
import {
  LoopProposalSchema,
  mergeLoopProposal,
  parseLoopProposal,
  type LoopProposal,
} from '../constants/loop-proposal'

export const GAME_LOOP_WORKFLOW_ID = 'game-loop-refinement'

const WorkflowInputSchema = z.object({
  projectId: z.string().uuid(),
  genre: z.string(),
  loopType: z.enum(['core', 'meta', 'social', 'monetization']).default('core'),
  targetAudience: z.enum(['casual', 'midcore', 'hardcore']).default('midcore'),
  theme: z.string().optional(),
  referenceGames: z.array(z.string()).optional(),
})

const BalanceAnalysisSuccessSchema = AnalyzeBalanceOutputSchema.extend({
  success: z.literal(true),
  loopId: z.string().optional(),
})

const BalanceAnalysisFailureSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

const BalanceAnalysisResultSchema = z.union([
  BalanceAnalysisSuccessSchema,
  BalanceAnalysisFailureSchema,
])

const StructureValidationMetricsSchema = z.object({
  nodeCount: z.number(),
  edgeCount: z.number(),
  cycleDetected: z.boolean(),
})

const StructureValidationResultSchema = z.object({
  isValid: z.boolean(),
  structureIssues: z.array(z.string()),
  metrics: StructureValidationMetricsSchema.nullable(),
})

const WorkflowOutputSchema = z.object({
  loopId: z.string().uuid().optional(),
  loop: LoopProposalSchema.optional(),
  balanceAnalysis: BalanceAnalysisResultSchema.optional(),
  status: z.enum(['completed', 'needs_review', 'failed']),
  message: z.string(),
})

const IdeationOutputSchema = WorkflowInputSchema.extend({
  loopProposal: LoopProposalSchema.optional(),
  thought: z.string().optional(),
  iterationCount: z.number(),
})

const BalanceCheckOutputSchema = IdeationOutputSchema.extend({
  balanceAnalysis: BalanceAnalysisResultSchema.nullable().optional(),
  passesValidation: z.boolean(),
  issues: z.array(z.string()),
})

const StructureCheckOutputSchema = BalanceCheckOutputSchema.extend({
  structureValidation: StructureValidationResultSchema,
})

const HumanReviewResumeSchema = z.object({
  approved: z.boolean(),
  feedback: z.string().optional(),
  modifications: LoopProposalSchema.partial().optional(),
})

const HumanReviewOutputSchema = StructureCheckOutputSchema.extend({
  approved: z.boolean(),
  feedback: z.string().optional(),
  modifications: LoopProposalSchema.partial().optional(),
})

const RefinementOutputSchema = StructureCheckOutputSchema.extend({
  refinedLoop: LoopProposalSchema.optional(),
  reachedLimit: z.boolean(),
})

export type WorkflowInput = z.infer<typeof WorkflowInputSchema>
export type WorkflowOutput = z.infer<typeof WorkflowOutputSchema>
type BalanceAnalysisResult = z.infer<typeof BalanceAnalysisResultSchema>
type BalanceIssue = z.infer<typeof AnalyzeBalanceOutputSchema>['issues'][number]
type LoopModifications = Partial<LoopProposal>

async function invokeTool<TInput, TOutput>(
  tool: {
    id: string
    execute?: (
      inputData: TInput,
      context: ToolExecutionContext
    ) => Promise<TOutput | ValidationError | undefined>
  },
  input: TInput
): Promise<TOutput> {
  if (!tool.execute) {
    throw new Error(`Tool ${tool.id} has no execute function`)
  }
  const result = await tool.execute(input, { observe: noopObserve })
  if (result === undefined || result === null) {
    throw new Error(`Tool ${tool.id} returned no result`)
  }
  if (isValidationError(result)) {
    throw new Error(`Tool ${tool.id} input validation failed: ${JSON.stringify(result)}`)
  }
  return result
}

function extractLoopProposalFromResponse(
  result: Awaited<ReturnType<GameDesignAgent['designLoop']>>
): LoopProposal | undefined {
  if (result.type === GameDesignResponseType.ProposePlan) {
    return parseLoopProposal(result.payload.plan)
  }

  if (result.type === GameDesignResponseType.Finish) {
    return parseLoopProposal(result.payload.result)
  }

  if (result.type === GameDesignResponseType.ExecuteStep) {
    return parseLoopProposal(result.payload.result)
  }

  return undefined
}

function isBalanceSuccess(
  result: BalanceAnalysisResult | null | undefined
): result is z.infer<typeof BalanceAnalysisSuccessSchema> {
  return result?.success === true
}

function buildValidatedLoop(loopProposal: LoopProposal): z.infer<typeof GameLoopSchema> {
  const parsedLoop = GameLoopSchema.partial().parse(loopProposal)
  return {
    id: parsedLoop.id ?? crypto.randomUUID(),
    projectId: parsedLoop.projectId ?? crypto.randomUUID(),
    name: parsedLoop.name ?? 'Untitled Loop',
    type: parsedLoop.type ?? 'core',
    nodes: parsedLoop.nodes ?? [],
    edges: parsedLoop.edges ?? [],
    resources: parsedLoop.resources ?? [],
    validationState: parsedLoop.validationState ?? 'draft',
    createdAt: parsedLoop.createdAt ?? new Date(),
    updatedAt: parsedLoop.updatedAt ?? new Date(),
    metrics: parsedLoop.metrics,
  }
}

type StructureValidationIssue = { description: string }

export function createGameLoopWorkflowGraph(agent: GameDesignAgent, maxIterations = 3) {
  const ideationStep = createStep({
    id: 'ideation',
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

  const balanceCheckStep = createStep({
    id: 'balance_check',
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
          issues: ['No mechanics to analyze - skipping balance check'],
        }
      }

      const parsedMechanics = z.array(GameMechanicSchema).safeParse(mechanicsToAnalyze)
      if (!parsedMechanics.success) {
        return {
          ...inputData,
          balanceAnalysis: null,
          passesValidation: false,
          issues: ['Mechanics failed schema validation for balance analysis'],
        }
      }

      const result = await invokeTool(analyzeTool, {
        loopId: loopProposal?.id ?? crypto.randomUUID(),
        mechanics: parsedMechanics.data,
        resources: loopProposal?.resources ?? [],
        targetAudience: inputData.targetAudience,
        sessionDurationMinutes: 30,
      })

      const parsedResult = BalanceAnalysisResultSchema.safeParse(result)
      if (!parsedResult.success) {
        return {
          ...inputData,
          balanceAnalysis: null,
          passesValidation: false,
          issues: ['Balance analysis returned an invalid payload'],
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

      const criticalIssues =
        parsedResult.data.issues.filter((issue: BalanceIssue) => issue.severity === 'critical')

      return {
        ...inputData,
        balanceAnalysis: parsedResult.data,
        passesValidation: criticalIssues.length === 0,
        issues: parsedResult.data.issues.map((issue: BalanceIssue) => issue.description),
      }
    },
  })

  const structureValidationStep = createStep({
    id: 'structure_validation',
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
            structureIssues: ['No loop structure to validate'],
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
            structureIssues: ['Loop proposal mechanics failed schema validation'],
            metrics: null,
          },
        }
      }

      const result = await invokeTool(validateTool, {
        loop: buildValidatedLoop(loopProposal),
        mechanics: parsedMechanics.data,
      })

      if (!result.success) {
        return {
          ...inputData,
          structureValidation: {
            isValid: false,
            structureIssues: [result.error ?? 'Structure validation failed'],
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

  const humanReviewStep = createStep({
    id: 'human_review',
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
        reason: 'Awaiting human review of loop proposal',
        loopProposal: inputData.loopProposal,
        balanceAnalysis: inputData.balanceAnalysis ?? undefined,
        structureValidation: inputData.structureValidation,
      })
    },
  })

  const refinementStep = createStep({
    id: 'refinement',
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
          refinedLoop: mergeLoopProposal(loopProposal, inputData.modifications),
          iterationCount: iterationCount + 1,
          reachedLimit: false,
        }
      }

      if (inputData.feedback) {
        const resultText = await agent.run(
          `Refine the following game loop based on user feedback: ${inputData.feedback}`,
          `Current loop: ${JSON.stringify(loopProposal)}`
        )

        let refinedLoop = loopProposal
        const jsonMatch = resultText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          refinedLoop = parseLoopProposal(JSON.parse(jsonMatch[0])) ?? loopProposal
        }

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

  const finalizationStep = createStep({
    id: 'finalization',
    inputSchema: RefinementOutputSchema,
    outputSchema: WorkflowOutputSchema,
    execute: async ({ inputData }) => {
      const refinedLoop = parseLoopProposal(inputData.refinedLoop) ?? parseLoopProposal(inputData.loopProposal)
      const balanceAnalysis = BalanceAnalysisResultSchema.optional().safeParse(inputData.balanceAnalysis)
        .success
        ? BalanceAnalysisResultSchema.parse(inputData.balanceAnalysis)
        : undefined

      try {
        if (!refinedLoop?.nodes) {
          return {
            status: 'failed' as const,
            message: 'No valid loop structure generated',
          }
        }

        const [savedLoop] = await db
          .insert(gameLoops)
          .values({
            projectId: inputData.projectId,
            userId: 'system',
            name: refinedLoop.name ?? 'Untitled Loop',
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
          status: 'completed' as const,
          message: `Game loop "${refinedLoop.name ?? 'Untitled'}" created successfully`,
        }
      } catch (error: unknown) {
        return {
          status: 'failed' as const,
          message: `Failed to save loop: ${getErrorMessage(error)}`,
        }
      }
    },
  })

  return createWorkflow({
    id: GAME_LOOP_WORKFLOW_ID,
    description: 'Design, validate, review, and persist a game loop.',
    inputSchema: WorkflowInputSchema,
    outputSchema: WorkflowOutputSchema,
  })
    .then(ideationStep)
    .then(balanceCheckStep)
    .then(structureValidationStep)
    .then(humanReviewStep)
    .then(refinementStep)
    .then(finalizationStep)
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

    if (result.status === 'failed') {
      return {
        status: 'failed',
        message: getErrorMessage(result.error),
      }
    }

    if (result.status === 'suspended') {
      return {
        status: 'needs_review',
        message: 'Workflow suspended for human review',
      }
    }

    if (result.status !== 'success') {
      return {
        status: 'failed',
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
      step: 'human_review',
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
