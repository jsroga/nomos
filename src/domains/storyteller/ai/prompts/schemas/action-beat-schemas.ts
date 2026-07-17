/** Beat board action Zod schemas. */
import { z } from 'zod'
import { BeatProposalSchema, BeatTypeSchema } from './beat-core-schemas'
// --- Beat Board & Plotting ---

export const CreateBeatActionSchema = z.object({
  type: z.literal('CREATE_BEAT'),
  payload: BeatProposalSchema,
})

export const UpdateBeatContentActionSchema = z.object({
  type: z.literal('UPDATE_BEAT_CONTENT'),
  payload: z.object({
    beatId: z.string(),
    logline: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  }),
})

// Alias for backward compatibility if needed, but prefer UPDATE_BEAT_CONTENT
export const UpdateBeatActionSchema = z.object({
  type: z.literal('UPDATE_BEAT'),
  payload: z.object({
    beatId: z.string(),
    updates: z
      .object({
        logline: z.string().nullable().optional(),
        content: z.string().nullable().optional(),
        beatType: BeatTypeSchema.nullable().optional(),
        charactersInvolved: z.array(z.string()).nullable().optional(),
        visualHook: z.string().nullable().optional(),
        emotionalShifts: z
          .array(
            z.object({
              characterName: z.string(),
              emotionalShift: z.string(),
            })
          )
          .nullable()
          .optional(),
        status: z.enum(['proposed', 'approved', 'rejected']).nullable().optional(),
      })
      .describe('Partial updates to beat content'),
  }),
})

export const ReorderBeatActionSchema = z.object({
  type: z.literal('REORDER_BEAT'),
  payload: z.object({
    beatId: z.string(),
    newIndex: z.number(),
  }),
})

export const DeleteBeatActionSchema = z.object({
  type: z.literal('DELETE_BEAT'),
  payload: z.object({
    beatId: z.string(),
    reason: z.string().nullable().optional(),
  }),
})

export const SplitBeatActionSchema = z.object({
  type: z.literal('SPLIT_BEAT'),
  payload: z.object({
    beatId: z.string(),
    splitPoint: z.string().describe('Where to split'),
  }),
})

export const MergeBeatsActionSchema = z.object({
  type: z.literal('MERGE_BEATS'),
  payload: z.object({
    beatIds: z.array(z.string()),
    mergedLogline: z.string(),
  }),
})

export const LinkBeatsActionSchema = z.object({
  type: z.literal('LINK_BEATS'),
  payload: z.object({
    sourceBeatId: z.string(),
    targetBeatId: z.string(),
    relationType: z.enum(['causes', 'mirrors', 'contrasts', 'setups']),
  }),
})

export const TagBeatActionSchema = z.object({
  type: z.literal('TAG_BEAT'),
  payload: z.object({
    beatId: z.string(),
    tag: z.string(),
  }),
})
