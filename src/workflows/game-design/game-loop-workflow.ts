import { Workflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { GameDesignAgent } from '../../domains/game-design/agent'
import {
  createAnalyzeMechanicBalanceTool,
  createValidateLoopStructureTool,
} from '../../domains/game-design/tools/v2/logic-transformers'
import { db } from '../../lib/db'
import { gameLoops } from '../../db/schema'
import { getErrorMessage } from '@/lib/error-utils'

// ==========================================
// WORKFLOW INPUT/OUTPUT SCHEMAS
// ==========================================

const WorkflowInputSchema = z.object({
  projectId: z.string().uuid(),
  genre: z.string(),
  loopType: z.enum(['core', 'meta', 'social', 'monetization']).default('core'),
  targetAudience: z.enum(['casual', 'midcore', 'hardcore']).default('midcore'),
  theme: z.string().optional(),
  referenceGames: z.array(z.string()).optional(),
})

const WorkflowOutputSchema = z.object({
  loopId: z.string().uuid().optional(),
  loop: z.any().optional(),
  balanceAnalysis: z.any().optional(),
  status: z.enum(['completed', 'needs_review', 'failed']),
  message: z.string(),
})

type WorkflowInput = z.infer<typeof WorkflowInputSchema>
type WorkflowOutput = z.infer<typeof WorkflowOutputSchema>

interface WorkflowContext {
  input: WorkflowInput
  loopProposal?: any
  mechanics?: any[]
  balanceAnalysis?: any
  structureValidation?: any
  approved?: boolean
  feedback?: string
  modifications?: any
  iterationCount: number
}

/**
 * GameLoopWorkflow - Mastra-based workflow for game loop design
 *
 * Flow:
 * 1. Ideation: Agent proposes initial loop design
 * 2. Balance Check: Analyze mechanics for balance issues
 * 3. Structure Validation: Verify loop integrity
 * 4. Human Review: User approves or provides feedback (suspension point)
 * 5. Refinement: Agent refines based on feedback (if needed)
 * 6. Finalization: Save loop to database
 */
export class GameLoopWorkflow extends Workflow {
  private agent: GameDesignAgent
  private maxIterations = 3

  constructor(agent: GameDesignAgent) {
    super({ name: 'game-loop-refinement' })
    this.agent = agent

    // Step 1: Ideation - Agent proposes initial loop
    this.step('ideation', {
      execute: async ({ context }) => {
        const { genre, loopType, targetAudience, theme, referenceGames } = context.input || context

        const result = await this.agent.designLoop({
          genre,
          targetAudience,
          theme,
          loopType,
          referenceGames,
        })

        return {
          loopProposal: result.payload,
          thought: result.thought,
          iterationCount: 0,
        }
      },
    })

    // Step 2: Balance Check - Analyze mechanics for balance issues
    this.step('balance_check', {
      execute: async ({ context }) => {
        const { loopProposal, input } = context
        const analyzeTool = createAnalyzeMechanicBalanceTool()

        const mechanicsToAnalyze = loopProposal?.mechanics || []

        if (mechanicsToAnalyze.length === 0) {
          return {
            balanceAnalysis: null,
            passesValidation: true,
            issues: ['No mechanics to analyze - skipping balance check'],
          }
        }

        const result = await analyzeTool.execute({
          context: {
            loopId: loopProposal?.id || crypto.randomUUID(),
            mechanics: mechanicsToAnalyze,
            resources: loopProposal?.resources || [],
            targetAudience: input?.targetAudience || 'midcore',
            sessionDurationMinutes: 30,
          },
        })

        if (!result.success) {
          return {
            balanceAnalysis: null,
            passesValidation: false,
            issues: [result.error || 'Balance analysis failed'],
          }
        }

        const criticalIssues = result.issues?.filter((i: any) => i.severity === 'critical') || []

        return {
          balanceAnalysis: result,
          passesValidation: criticalIssues.length === 0,
          issues: result.issues?.map((i: any) => i.description) || [],
        }
      },
    })

    // Step 3: Structure Validation - Verify loop integrity
    this.step('structure_validation', {
      execute: async ({ context }) => {
        const { loopProposal } = context
        const validateTool = createValidateLoopStructureTool()

        if (!loopProposal?.nodes || loopProposal.nodes.length === 0) {
          return {
            isValid: true,
            structureIssues: ['No loop structure to validate'],
            metrics: { nodeCount: 0, edgeCount: 0, cycleDetected: false },
          }
        }

        const result = await validateTool.execute({
          context: {
            loop: loopProposal,
            mechanics: loopProposal.mechanics || [],
          },
        })

        if (!result.success) {
          return {
            isValid: false,
            structureIssues: [result.error || 'Structure validation failed'],
            metrics: null,
          }
        }

        return {
          isValid: result.isValid,
          structureIssues: result.issues?.map((i: any) => i.description) || [],
          metrics: result.metrics,
        }
      },
    })

    // Step 4: Human Review - Suspension point for user approval
    this.step('human_review', {
      execute: async ({ context, suspend }) => {
        // If we have approval data (resumed from suspension)
        if (context.approved !== undefined) {
          return {
            approved: context.approved,
            feedback: context.feedback,
            modifications: context.modifications,
          }
        }

        // Suspend for human review
        await suspend({
          reason: 'Awaiting human review of loop proposal',
          data: {
            loopProposal: context.loopProposal,
            balanceAnalysis: context.balanceAnalysis,
            structureValidation: context.structureValidation,
          },
        })

        return {
          approved: false,
          feedback: 'Suspended for review',
        }
      },
    })

    // Step 5: Refinement - Agent refines based on feedback
    this.step('refinement', {
      execute: async ({ context }) => {
        const { loopProposal, feedback, modifications, iterationCount = 0 } = context

        // Check iteration limit
        if (iterationCount >= this.maxIterations) {
          return {
            refinedLoop: loopProposal,
            iterationCount,
            reachedLimit: true,
          }
        }

        // Apply direct modifications if provided
        if (modifications) {
          return {
            refinedLoop: { ...loopProposal, ...modifications },
            iterationCount: iterationCount + 1,
            reachedLimit: false,
          }
        }

        // Use agent to refine based on feedback
        if (feedback) {
          const result = await this.agent.runLoop(
            `Refine the following game loop based on user feedback: ${feedback}`,
            `Current loop: ${JSON.stringify(loopProposal)}`
          )

          return {
            refinedLoop: result.payload,
            iterationCount: iterationCount + 1,
            reachedLimit: false,
          }
        }

        return {
          refinedLoop: loopProposal,
          iterationCount,
          reachedLimit: false,
        }
      },
    })

    // Step 6: Finalization - Save to database
    this.step('finalization', {
      execute: async ({ context }) => {
        const { input, loopProposal, refinedLoop, balanceAnalysis } = context
        const finalLoop = refinedLoop || loopProposal

        try {
          const [savedLoop] = await db
            .insert(gameLoops)
            .values({
              projectId: input.projectId,
              userId: 'system',
              name: finalLoop?.name || 'Untitled Loop',
              nodes: finalLoop?.nodes || [],
              edges: finalLoop?.edges || [],
              metadata: {
                type: finalLoop?.type || input.loopType,
                resources: finalLoop?.resources,
                metrics: finalLoop?.metrics,
                genre: input.genre,
                targetAudience: input.targetAudience,
              },
              analysis: balanceAnalysis || null,
            })
            .returning()

          return {
            loopId: savedLoop.id,
            loop: finalLoop,
            balanceAnalysis,
            status: 'completed' as const,
            message: `Game loop "${finalLoop?.name || 'Untitled'}" created successfully`,
          }
        } catch (error: unknown) {
          return {
            status: 'failed' as const,
            message: `Failed to save loop: ${getErrorMessage(error)}`,
          }
        }
      },
    })

    // Commit the workflow graph
    this.commit()
  }

  /**
   * Execute the workflow with custom context
   */
  async run(input: WorkflowInput): Promise<WorkflowOutput> {
    const result = await this.execute({
      triggerData: { input },
    })
    return result as WorkflowOutput
  }

  /**
   * Resume a suspended workflow with user feedback
   */
  async resumeWithFeedback(
    runId: string,
    feedback: {
      approved: boolean
      feedback?: string
      modifications?: any
    }
  ) {
    return this.resume({
      runId,
      stepId: 'human_review',
      context: feedback,
    })
  }
}

/**
 * Create a GameLoopWorkflow instance
 */
export async function createGameLoopWorkflow(agentConfig: {
  modelName: string
  connectionString?: string
}): Promise<GameLoopWorkflow> {
  const { GameDesignAgent } = await import('../../domains/game-design/agent')
  const { createGameDesignMemory } = await import('../../domains/game-design/memory')

  // Create memory if connection string provided
  const memory = agentConfig.connectionString
    ? createGameDesignMemory(agentConfig.connectionString)
    : undefined

  // Create file-based persistence for planner
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

  return new GameLoopWorkflow(agent)
}
