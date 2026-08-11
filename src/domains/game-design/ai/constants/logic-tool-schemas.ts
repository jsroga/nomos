import { z } from 'zod'
import {
  GameLoopSchema,
  GameMechanicSchema,
  GameResourceSchema,
} from '../../core/schemas'
import { ExpansionDirection, TargetAudience } from './logic-tool-wire'

export const AnalyzeMechanicBalanceInputSchema = z.object({
  loopId: z.string().uuid(),
  mechanics: z.array(GameMechanicSchema),
  resources: z.array(GameResourceSchema),
  targetAudience: z.enum([
    TargetAudience.Casual,
    TargetAudience.Midcore,
    TargetAudience.Hardcore,
  ]),
  sessionDurationMinutes: z.number().default(30),
})

export const SuggestProgressionToolInputSchema = z.object({
  currentLoop: GameLoopSchema,
  existingMechanics: z.array(GameMechanicSchema).optional(),
  expansionDirection: z.enum([
    ExpansionDirection.Depth,
    ExpansionDirection.Breadth,
    ExpansionDirection.Complexity,
  ]),
  theme: z.string().optional(),
  genre: z.string().optional(),
  targetAudience: z
    .enum([TargetAudience.Casual, TargetAudience.Midcore, TargetAudience.Hardcore])
    .optional(),
})

export const ValidateLoopStructureInputSchema = z.object({
  loop: GameLoopSchema,
  mechanics: z.array(GameMechanicSchema),
})

export const ValidateLoopStructureOutputSchema = z.object({
  isValid: z.boolean(),
  issues: z.array(
    z.object({
      type: z.enum([
        'orphan_node',
        'missing_mechanic',
        'cycle_break',
        'unreachable_state',
        'invalid_edge',
      ]),
      severity: z.enum(['error', 'warning']),
      description: z.string(),
      affectedNodeIds: z.array(z.string()).optional(),
    })
  ),
  metrics: z.object({
    nodeCount: z.number(),
    edgeCount: z.number(),
    cycleDetected: z.boolean(),
    averagePathLength: z.number().optional(),
  }),
})

export type GameResource = z.infer<typeof GameResourceSchema>

export type ValidateLoopStructureIssue = z.infer<
  typeof ValidateLoopStructureOutputSchema
>['issues'][number]
