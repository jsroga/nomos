/**
 * Beat Management Tools - GRRM Solo Model
 *
 * Consolidated beat CRUD with mandatory action-beat enforcement.
 * Every beat must move action forward (Law of Motion).
 */

import '@/shared/data/server-guard'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { beats } from '@/db/schema'
import { db } from '@/db/client'
import { eq, and, type SQL } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { BeatType, BeatStatus } from '@/domains/storyteller/core/types/enums'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { recordFromJson, stringArrayFromJson } from '@/shared/data/deep-merge'
import {
  STORYTELLER_EPISODE_ID,
  requestContextString,
} from '@/domains/storyteller/ai/request-context'

type ActionFields = {
  actionTaken: string
  consequence: string
  storyStateChange: string
}

function packSetupsPayoffs(
  setupsPayoffs: z.infer<typeof BeatDataSchema>['setupsPayoffs'],
  action: ActionFields,
) {
  return { ...(setupsPayoffs ?? {}), ...action }
}

function unpackActionFields(setupsPayoffs: unknown): Partial<ActionFields> {
  const value = recordFromJson(setupsPayoffs)
  return {
    actionTaken: typeof value.actionTaken === 'string' ? value.actionTaken : undefined,
    consequence: typeof value.consequence === 'string' ? value.consequence : undefined,
    storyStateChange:
      typeof value.storyStateChange === 'string' ? value.storyStateChange : undefined,
  }
}

function beatResponse(beat: typeof beats.$inferSelect) {
  const action = unpackActionFields(beat.setupsPayoffs)
  return {
    id: beat.id,
    episodeId: beat.episodeId,
    sequence: beat.sequence,
    logline: beat.logline,
    content: beat.content ?? undefined,
    beatType: beat.beatType,
    status: beat.status,
    actionTaken: action.actionTaken,
    consequence: action.consequence,
    storyStateChange: action.storyStateChange,
    visualHook: beat.visualHook ?? undefined,
    charactersInvolved: stringArrayFromJson(beat.charactersInvolved),
    emotionalShifts: recordFromJson(beat.emotionalShifts),
    causalDependencies: stringArrayFromJson(beat.causalDependencies),
    setupsPayoffs: recordFromJson(beat.setupsPayoffs),
  }
}

// ==========================================
// SCHEMAS (with mandatory action fields)
// ==========================================

const BeatDataSchema = z.object({
  logline: z.string().min(1).describe('One-line summary of what happens'),
  content: z.string().optional().describe('Full beat content/description'),
  visualHook: z.string().optional().describe('The iconic visual that opens this beat'),
  beatType: z
    .enum(['setup', 'confrontation', 'resolution', 'transition', 'revelation', 'climax', 'default'])
    .optional()
    .describe('Type of story beat'),
  charactersInvolved: z.array(z.string()).optional().describe('Character names in this beat'),
  emotionalShifts: z
    .record(z.object({ from: z.string(), to: z.string() }))
    .optional()
    .describe('Emotional shifts per character'),
  causalDependencies: z.array(z.string()).optional().describe('Beat IDs this beat depends on'),
  setupsPayoffs: z
    .object({
      setupId: z.string().optional(),
      payoffFor: z.string().optional(),
    })
    .optional()
    .describe('Setup/payoff tracking'),
  
  // MANDATORY ACTION FIELDS (Law of Motion)
  actionTaken: z.string().min(1).describe('REQUIRED: What character(s) did or decided. No static description beats.'),
  consequence: z.string().min(1).describe('REQUIRED: Immediate result/change from the action'),
  storyStateChange: z.string().min(1).describe('REQUIRED: How world/relationships/plot shifted'),
})

const ManageBeatInputSchema = z.object({
  operation: z.enum(['create', 'update', 'delete', 'get', 'list']).describe('The operation to perform'),
  beatId: z.string().uuid().optional().describe('Beat ID for update/delete/get operations'),
  episodeId: z.string().uuid().optional().describe('Episode ID (required for create)'),
  projectId: z.string().uuid().optional().describe('Project ID for context'),
  sequence: z.number().int().positive().optional().describe('Sequence number for the beat'),
  data: BeatDataSchema.optional().describe('Beat data for create/update (action fields required)'),
})

const ListBeatsInputSchema = z.object({
  episodeId: z.string().uuid().optional().describe('Filter by episode ID'),
  projectId: z.string().uuid().optional().describe('Filter by project ID'),
  status: z.enum(['proposed', 'approved', 'locked']).optional().describe('Filter by status'),
  includeContent: z.boolean().optional().default(false).describe('Include full content'),
})

// ==========================================
// OUTPUT SCHEMAS
// ==========================================

const BeatOutputSchema = z.object({
  id: z.string().uuid(),
  episodeId: z.string().uuid(),
  sequence: z.number(),
  logline: z.string(),
  content: z.string().optional(),
  beatType: z.string(),
  status: z.string(),
  actionTaken: z.string().optional(),
  consequence: z.string().optional(),
  storyStateChange: z.string().optional(),
  visualHook: z.string().optional(),
  charactersInvolved: z.array(z.string()).optional(),
  emotionalShifts: z.record(z.object({ from: z.string(), to: z.string() })).optional(),
  causalDependencies: z.array(z.string()).optional(),
  setupsPayoffs: z.record(z.unknown()).optional(),
})

const ManageBeatOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  beat: BeatOutputSchema.optional(),
})

const ListBeatsOutputSchema = z.object({
  success: z.boolean(),
  beats: z.array(BeatOutputSchema),
  count: z.number(),
})

// ==========================================
// TOOLS
// ==========================================

/**
 * Unified beat management tool
 * Enforces mandatory action fields on create/update
 */
export const manageBeatTool = createTool({
  id: 'manage_beat',
  description:
    'Create, update, delete, or get a story beat. CREATE/UPDATE REQUIRE actionTaken, consequence, storyStateChange (Law of Motion: every beat must move action forward).',
  inputSchema: ManageBeatInputSchema,
  outputSchema: ManageBeatOutputSchema,
  execute: async (inputData, context) => {
    const { operation, beatId, sequence, data } = inputData
    // Server-trusted request-context IDs beat model-supplied input.
    const episodeId =
      requestContextString(context.requestContext, STORYTELLER_EPISODE_ID) ?? inputData.episodeId

    try {
      switch (operation) {
        case 'create': {
          if (!episodeId) {
            return {
              success: false,
              error: 'episodeId is required for create operation',
            }
          }
          if (!data) {
            return {
              success: false,
              error: 'data is required for create operation',
            }
          }

          // Validate mandatory action fields
          if (!data.actionTaken || !data.consequence || !data.storyStateChange) {
            return {
              success: false,
              error:
                'REJECTED: Every beat must include actionTaken, consequence, and storyStateChange (Law of Motion). No static description beats.',
            }
          }

          const newBeatId = uuidv4()
          const beatSequence = sequence ?? 1

          await db.insert(beats).values({
            id: newBeatId,
            episodeId,
            sequence: beatSequence,
            logline: data.logline,
            content: data.content ?? null,
            beatType: data.beatType ?? BeatType.SETUP,
            status: BeatStatus.PROPOSED,
            visualHook: data.visualHook ?? null,
            charactersInvolved: data.charactersInvolved ?? [],
            emotionalShifts: data.emotionalShifts ?? null,
            causalDependencies: data.causalDependencies ?? [],
            setupsPayoffs: packSetupsPayoffs(data.setupsPayoffs, {
              actionTaken: data.actionTaken,
              consequence: data.consequence,
              storyStateChange: data.storyStateChange,
            }),
          })

          const [created] = await db.select().from(beats).where(eq(beats.id, newBeatId))

          return {
            success: true,
            message: `Created beat "${data.logline}" at sequence ${beatSequence}`,
            beat: beatResponse(created),
          }
        }

        case 'update': {
          if (!beatId) {
            return {
              success: false,
              error: 'beatId is required for update operation',
            }
          }
          if (!data) {
            return {
              success: false,
              error: 'data is required for update operation',
            }
          }

          // Validate mandatory action fields if provided
          if (
            (data.actionTaken !== undefined ||
              data.consequence !== undefined ||
              data.storyStateChange !== undefined) &&
            (!data.actionTaken || !data.consequence || !data.storyStateChange)
          ) {
            return {
              success: false,
              error:
                'REJECTED: When updating action fields, all three (actionTaken, consequence, storyStateChange) must be non-empty (Law of Motion).',
            }
          }

          const updateFields: Partial<typeof beats.$inferInsert> = { updatedAt: new Date() }
          if (data.logline !== undefined) updateFields.logline = data.logline
          if (data.content !== undefined) updateFields.content = data.content
          if (data.visualHook !== undefined) updateFields.visualHook = data.visualHook
          if (data.beatType !== undefined) updateFields.beatType = data.beatType
          if (data.charactersInvolved !== undefined)
            updateFields.charactersInvolved = data.charactersInvolved
          if (data.emotionalShifts !== undefined) updateFields.emotionalShifts = data.emotionalShifts
          if (data.causalDependencies !== undefined)
            updateFields.causalDependencies = data.causalDependencies
          if (data.setupsPayoffs !== undefined) updateFields.setupsPayoffs = data.setupsPayoffs
          if (
            data.actionTaken !== undefined ||
            data.consequence !== undefined ||
            data.storyStateChange !== undefined
          ) {
            const [existing] = await db.select().from(beats).where(eq(beats.id, beatId))
            updateFields.setupsPayoffs = packSetupsPayoffs(
              data.setupsPayoffs ?? existing?.setupsPayoffs,
              {
                actionTaken: data.actionTaken ?? unpackActionFields(existing?.setupsPayoffs).actionTaken ?? '',
                consequence: data.consequence ?? unpackActionFields(existing?.setupsPayoffs).consequence ?? '',
                storyStateChange:
                  data.storyStateChange ??
                  unpackActionFields(existing?.setupsPayoffs).storyStateChange ??
                  '',
              },
            )
          }

          await db.update(beats).set(updateFields).where(eq(beats.id, beatId))

          const [updated] = await db.select().from(beats).where(eq(beats.id, beatId))

          if (!updated) {
            return {
              success: false,
              error: `Beat ${beatId} not found`,
            }
          }

          return {
            success: true,
            message: `Updated beat "${updated.logline}"`,
            beat: beatResponse(updated),
          }
        }

        case 'delete': {
          if (!beatId) {
            return {
              success: false,
              error: 'beatId is required for delete operation',
            }
          }

          const [beat] = await db.select().from(beats).where(eq(beats.id, beatId))

          if (!beat) {
            return {
              success: false,
              error: `Beat ${beatId} not found`,
            }
          }

          if (beat.status === BeatStatus.LOCKED) {
            return {
              success: false,
              error: 'Cannot delete a locked beat',
            }
          }

          await db.delete(beats).where(eq(beats.id, beatId))

          return {
            success: true,
            message: `Deleted beat "${beat.logline}"`,
          }
        }

        case 'get': {
          if (!beatId) {
            return {
              success: false,
              error: 'beatId is required for get operation',
            }
          }

          const [beat] = await db.select().from(beats).where(eq(beats.id, beatId))

          if (!beat) {
            return {
              success: false,
              error: `Beat ${beatId} not found`,
            }
          }

          return {
            success: true,
            beat: beatResponse(beat),
          }
        }

        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`,
          }
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error),
      }
    }
  },
})

/**
 * List beats with optional filters
 */
export const listBeatsTool = createTool({
  id: 'list_beats',
  description:
    'List all beats for an episode or project. Returns beat summaries with action fields.',
  inputSchema: ListBeatsInputSchema,
  outputSchema: ListBeatsOutputSchema,
  execute: async (inputData, context) => {
    const { status, includeContent } = inputData
    // Server-trusted request-context IDs beat model-supplied input.
    const episodeId =
      requestContextString(context.requestContext, STORYTELLER_EPISODE_ID) ?? inputData.episodeId

    try {
      const conditions: SQL[] = []
      if (episodeId) conditions.push(eq(beats.episodeId, episodeId))
      if (status) conditions.push(eq(beats.status, status))

      // drizzle accepts .where(undefined) — no builder reassignment needed
      const results = await db
        .select()
        .from(beats)
        .where(conditions.length > 0 ? and(...conditions) : undefined)

      const formattedBeats = results.map(beat => {
        const response = beatResponse(beat)
        if (!includeContent) {
          delete response.content
        }
        return response
      })

      return {
        success: true,
        beats: formattedBeats,
        count: formattedBeats.length,
      }
    } catch {
      return {
        success: false,
        beats: [],
        count: 0,
      }
    }
  },
})
