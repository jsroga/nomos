import { z } from 'zod'
import { AnalyzeBalanceOutputSchema } from '@/domains/game-design/core/schemas'
import { LoopProposalSchema } from '../constants/loop-proposal'
import {
  DEFAULT_LOOP_TYPE,
  DEFAULT_TARGET_AUDIENCE,
  GameLoopTypeInput,
  GameLoopWorkflowStatus,
} from '../constants/game-loop-workflow-wire'
import { TargetAudience } from '../constants/logic-tool-wire'

export const GAME_LOOP_WORKFLOW_ID = 'game-loop-refinement'

export const WorkflowInputSchema = z.object({
  projectId: z.string().uuid(),
  genre: z.string(),
  loopType: z
    .enum([
      GameLoopTypeInput.Core,
      GameLoopTypeInput.Meta,
      GameLoopTypeInput.Social,
      GameLoopTypeInput.Monetization,
    ])
    .default(DEFAULT_LOOP_TYPE),
  targetAudience: z
    .enum([TargetAudience.Casual, TargetAudience.Midcore, TargetAudience.Hardcore])
    .default(DEFAULT_TARGET_AUDIENCE),
  theme: z.string().optional(),
  referenceGames: z.array(z.string()).optional(),
})

export const BalanceAnalysisSuccessSchema = AnalyzeBalanceOutputSchema.extend({
  success: z.literal(true),
  loopId: z.string().optional(),
})

export const BalanceAnalysisFailureSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

export const BalanceAnalysisResultSchema = z.union([
  BalanceAnalysisSuccessSchema,
  BalanceAnalysisFailureSchema,
])

export const StructureValidationMetricsSchema = z.object({
  nodeCount: z.number(),
  edgeCount: z.number(),
  cycleDetected: z.boolean(),
})

export const StructureValidationResultSchema = z.object({
  isValid: z.boolean(),
  structureIssues: z.array(z.string()),
  metrics: StructureValidationMetricsSchema.nullable(),
})

/** Raw validate_loop_structure tool payload (success | failure). */
export const StructureValidateToolResultSchema = z.union([
  z.object({
    success: z.literal(true),
    isValid: z.boolean(),
    issues: z.array(z.object({ description: z.string() })),
    metrics: StructureValidationMetricsSchema,
  }),
  z.object({
    success: z.literal(false),
    error: z.string().optional(),
  }),
])

export const WorkflowOutputSchema = z.object({
  loopId: z.string().uuid().optional(),
  loop: LoopProposalSchema.optional(),
  balanceAnalysis: BalanceAnalysisResultSchema.optional(),
  status: z.enum([
    GameLoopWorkflowStatus.Completed,
    GameLoopWorkflowStatus.NeedsReview,
    GameLoopWorkflowStatus.Failed,
  ]),
  message: z.string(),
})

export const IdeationOutputSchema = WorkflowInputSchema.extend({
  loopProposal: LoopProposalSchema.optional(),
  thought: z.string().optional(),
  iterationCount: z.number(),
})

export const BalanceCheckOutputSchema = IdeationOutputSchema.extend({
  balanceAnalysis: BalanceAnalysisResultSchema.nullable().optional(),
  passesValidation: z.boolean(),
  issues: z.array(z.string()),
})

export const StructureCheckOutputSchema = BalanceCheckOutputSchema.extend({
  structureValidation: StructureValidationResultSchema,
})

export const HumanReviewResumeSchema = z.object({
  approved: z.boolean(),
  feedback: z.string().optional(),
  modifications: LoopProposalSchema.partial().optional(),
})

export const HumanReviewOutputSchema = StructureCheckOutputSchema.extend({
  approved: z.boolean(),
  feedback: z.string().optional(),
  modifications: LoopProposalSchema.partial().optional(),
})

export const RefinementOutputSchema = StructureCheckOutputSchema.extend({
  refinedLoop: LoopProposalSchema.optional(),
  reachedLimit: z.boolean(),
})

export type WorkflowInput = z.infer<typeof WorkflowInputSchema>
export type WorkflowOutput = z.infer<typeof WorkflowOutputSchema>
export type BalanceAnalysisResult = z.infer<typeof BalanceAnalysisResultSchema>
export type BalanceIssue = z.infer<typeof AnalyzeBalanceOutputSchema>['issues'][number]
export type LoopModifications = Partial<z.infer<typeof LoopProposalSchema>>
