/**
 * Beat Management Tools
 *
 * Direct CRUD operations for story beats.
 * Enables agents to create, update, delete, reorder, and duplicate beats
 * without going through the full Plot Architect narrative flow.
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { WritersRoomState, BeatCard } from '../graph/state'
import { BeatType, BeatStatus } from '../enums'
import { v4 as uuidv4 } from 'uuid'

// Schema for beat data
const BeatDataSchema = z.object({
  logline: z.string().optional().describe('One-line summary of what happens'),
  content: z.string().optional().describe('Full beat content/description'),
  visualHook: z.string().optional().describe('The iconic visual that opens this beat'),
  beatType: z
    .enum(['setup', 'confrontation', 'resolution', 'transition', 'revelation', 'climax', 'default'])
    .optional()
    .describe('Type of story beat'),
  charactersInvolved: z.array(z.string()).optional().describe('Character names in this beat'),
  emotionalShifts: z
    .record(
      z.object({
        from: z.string(),
        to: z.string(),
      })
    )
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
  mazurElements: z
    .object({
      character: z.string().optional(),
      object: z.string().optional(),
      coreConcept: z.string().optional(),
      attribute: z.string().optional(),
      action: z.string().optional(),
      method: z.string().optional(),
      setting: z.string().optional(),
      timeframe: z.string().optional(),
      motivation: z.string().optional(),
      tone: z.string().optional(),
    })
    .optional()
    .describe('Mazur benchmark elements'),
})

type BeatData = z.infer<typeof BeatDataSchema>

/**
 * Create a new beat card with defaults
 */
function createBeatCard(episodeId: string, sequence: number, data: Partial<BeatData>): BeatCard {
  return {
    id: uuidv4(),
    episodeId,
    sequence,
    logline: data.logline || '',
    content: data.content,
    beatType: (data.beatType as BeatType) || BeatType.DEFAULT,
    charactersInvolved: data.charactersInvolved || [],
    emotionalShifts: data.emotionalShifts || {},
    visualHook: data.visualHook || '',
    causalDependencies: data.causalDependencies || [],
    setupsPayoffs: data.setupsPayoffs || {},
    status: BeatStatus.PROPOSED,
    mazurElements: data.mazurElements,
  }
}

/**
 * Create the Beat Management Tool
 * This is a multi-operation tool that can create, update, delete, move, or duplicate beats
 */
export const createBeatManagementTool = (state: WritersRoomState) => {
  return new DynamicStructuredTool({
    name: 'manage_beat',
    description: `Direct beat manipulation tool. Use this for quick beat operations without full Plot Architect deliberation.

Operations:
- create: Add a new beat at a specific position
- update: Modify an existing beat's content
- delete: Remove a beat from the board
- move: Change a beat's position in the sequence
- duplicate: Copy a beat to create a variant
- approve: Mark a beat as approved
- lock: Lock a beat (prevents further edits)
- get: Retrieve a specific beat's details
- list: List all beats with their status

Use this tool when you need to:
- Make quick edits without full deliberation
- Reorder the beat sequence
- Create beat variants for comparison
- Batch-update beat statuses`,
    schema: z.object({
      operation: z
        .enum(['create', 'update', 'delete', 'move', 'duplicate', 'approve', 'lock', 'get', 'list'])
        .describe('The operation to perform'),
      beatId: z
        .string()
        .optional()
        .describe(
          'ID of the beat to operate on (required for update/delete/move/duplicate/approve/lock/get)'
        ),
      data: BeatDataSchema.optional().describe('Beat data for create/update operations'),
      targetPosition: z
        .number()
        .optional()
        .describe('Target sequence number for create/move operations'),
    }),
    func: async ({ operation, beatId, data, targetPosition }) => {
      const episodeId = state.episodeId || 'general'
      const beatBoard = [...state.beatBoard]

      switch (operation) {
        case 'create': {
          const sequence = targetPosition ?? beatBoard.length + 1
          const newBeat = createBeatCard(episodeId, sequence, data || {})

          // Shift existing beats if inserting in the middle
          beatBoard.forEach(beat => {
            if (beat.sequence >= sequence) {
              beat.sequence += 1
            }
          })
          beatBoard.push(newBeat)
          beatBoard.sort((a, b) => a.sequence - b.sequence)

          return JSON.stringify({
            success: true,
            message: `Created beat "${newBeat.logline || 'Untitled'}" at position ${sequence}`,
            beat: {
              id: newBeat.id,
              sequence: newBeat.sequence,
              logline: newBeat.logline,
              status: newBeat.status,
            },
          })
        }

        case 'update': {
          if (!beatId)
            return JSON.stringify({ success: false, error: 'beatId required for update' })

          const beatIndex = beatBoard.findIndex(b => b.id === beatId)
          if (beatIndex === -1)
            return JSON.stringify({ success: false, error: `Beat ${beatId} not found` })

          const beat = beatBoard[beatIndex]
          if (beat.status === BeatStatus.LOCKED) {
            return JSON.stringify({ success: false, error: 'Cannot update a locked beat' })
          }

          // Merge updates
          if (data) {
            if (data.logline !== undefined) beat.logline = data.logline
            if (data.content !== undefined) beat.content = data.content
            if (data.visualHook !== undefined) beat.visualHook = data.visualHook
            if (data.beatType !== undefined) beat.beatType = data.beatType as BeatType
            if (data.charactersInvolved !== undefined)
              beat.charactersInvolved = data.charactersInvolved
            if (data.emotionalShifts !== undefined) beat.emotionalShifts = data.emotionalShifts
            if (data.causalDependencies !== undefined)
              beat.causalDependencies = data.causalDependencies
            if (data.setupsPayoffs !== undefined) beat.setupsPayoffs = data.setupsPayoffs
            if (data.mazurElements !== undefined) beat.mazurElements = data.mazurElements
          }

          return JSON.stringify({
            success: true,
            message: `Updated beat "${beat.logline}"`,
            beat: {
              id: beat.id,
              sequence: beat.sequence,
              logline: beat.logline,
              status: beat.status,
            },
          })
        }

        case 'delete': {
          if (!beatId)
            return JSON.stringify({ success: false, error: 'beatId required for delete' })

          const beatIndex = beatBoard.findIndex(b => b.id === beatId)
          if (beatIndex === -1)
            return JSON.stringify({ success: false, error: `Beat ${beatId} not found` })

          const beat = beatBoard[beatIndex]
          if (beat.status === BeatStatus.LOCKED) {
            return JSON.stringify({ success: false, error: 'Cannot delete a locked beat' })
          }

          const deletedSequence = beat.sequence
          beatBoard.splice(beatIndex, 1)

          // Resequence remaining beats
          beatBoard.forEach(b => {
            if (b.sequence > deletedSequence) {
              b.sequence -= 1
            }
          })

          return JSON.stringify({
            success: true,
            message: `Deleted beat "${beat.logline}"`,
            deletedId: beatId,
          })
        }

        case 'move': {
          if (!beatId) return JSON.stringify({ success: false, error: 'beatId required for move' })
          if (targetPosition === undefined)
            return JSON.stringify({ success: false, error: 'targetPosition required for move' })

          const beatIndex = beatBoard.findIndex(b => b.id === beatId)
          if (beatIndex === -1)
            return JSON.stringify({ success: false, error: `Beat ${beatId} not found` })

          const beat = beatBoard[beatIndex]
          const oldSequence = beat.sequence
          const newSequence = targetPosition

          // Update sequences
          beatBoard.forEach(b => {
            if (b.id === beatId) {
              b.sequence = newSequence
            } else if (
              oldSequence < newSequence &&
              b.sequence > oldSequence &&
              b.sequence <= newSequence
            ) {
              b.sequence -= 1
            } else if (
              oldSequence > newSequence &&
              b.sequence >= newSequence &&
              b.sequence < oldSequence
            ) {
              b.sequence += 1
            }
          })
          beatBoard.sort((a, b) => a.sequence - b.sequence)

          return JSON.stringify({
            success: true,
            message: `Moved beat "${beat.logline}" from position ${oldSequence} to ${newSequence}`,
          })
        }

        case 'duplicate': {
          if (!beatId)
            return JSON.stringify({ success: false, error: 'beatId required for duplicate' })

          const originalBeat = beatBoard.find(b => b.id === beatId)
          if (!originalBeat)
            return JSON.stringify({ success: false, error: `Beat ${beatId} not found` })

          const newSequence = originalBeat.sequence + 1

          // Shift beats after the original
          beatBoard.forEach(b => {
            if (b.sequence >= newSequence) {
              b.sequence += 1
            }
          })

          const duplicateBeat: BeatCard = {
            ...originalBeat,
            id: uuidv4(),
            sequence: newSequence,
            logline: `${originalBeat.logline} (variant)`,
            status: BeatStatus.PROPOSED,
          }
          beatBoard.push(duplicateBeat)
          beatBoard.sort((a, b) => a.sequence - b.sequence)

          return JSON.stringify({
            success: true,
            message: `Duplicated beat "${originalBeat.logline}"`,
            newBeat: {
              id: duplicateBeat.id,
              sequence: duplicateBeat.sequence,
              logline: duplicateBeat.logline,
            },
          })
        }

        case 'approve': {
          if (!beatId)
            return JSON.stringify({ success: false, error: 'beatId required for approve' })

          const beat = beatBoard.find(b => b.id === beatId)
          if (!beat) return JSON.stringify({ success: false, error: `Beat ${beatId} not found` })

          beat.status = BeatStatus.APPROVED
          return JSON.stringify({
            success: true,
            message: `Approved beat "${beat.logline}"`,
            status: BeatStatus.APPROVED,
          })
        }

        case 'lock': {
          if (!beatId) return JSON.stringify({ success: false, error: 'beatId required for lock' })

          const beat = beatBoard.find(b => b.id === beatId)
          if (!beat) return JSON.stringify({ success: false, error: `Beat ${beatId} not found` })

          if (beat.status !== BeatStatus.APPROVED) {
            return JSON.stringify({ success: false, error: 'Beat must be approved before locking' })
          }

          beat.status = BeatStatus.LOCKED
          return JSON.stringify({
            success: true,
            message: `Locked beat "${beat.logline}"`,
            status: BeatStatus.LOCKED,
          })
        }

        case 'get': {
          if (!beatId) return JSON.stringify({ success: false, error: 'beatId required for get' })

          const beat = beatBoard.find(b => b.id === beatId)
          if (!beat) return JSON.stringify({ success: false, error: `Beat ${beatId} not found` })

          return JSON.stringify({
            success: true,
            beat: beat,
          })
        }

        case 'list': {
          const summary = beatBoard
            .sort((a, b) => a.sequence - b.sequence)
            .map(b => ({
              id: b.id,
              sequence: b.sequence,
              logline: b.logline.substring(0, 60) + (b.logline.length > 60 ? '...' : ''),
              status: b.status,
              beatType: b.beatType,
              hasVisualHook: !!b.visualHook,
              characterCount: b.charactersInvolved.length,
            }))

          return JSON.stringify({
            success: true,
            totalBeats: summary.length,
            beats: summary,
            statusCounts: {
              proposed: summary.filter(b => b.status === BeatStatus.PROPOSED).length,
              approved: summary.filter(b => b.status === BeatStatus.APPROVED).length,
              locked: summary.filter(b => b.status === BeatStatus.LOCKED).length,
            },
          })
        }

        default:
          return JSON.stringify({ success: false, error: `Unknown operation: ${operation}` })
      }
    },
  })
}

/**
 * Create a simpler tool for just listing beats
 */
export const createBeatListTool = (state: WritersRoomState) => {
  return new DynamicStructuredTool({
    name: 'list_beats',
    description:
      'Get a quick summary of all beats in the current episode. Use this to understand the current beat board state.',
    schema: z.object({
      includeContent: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include full beat content in response (verbose)'),
      filterStatus: z
        .enum(['all', 'proposed', 'approved', 'locked'])
        .optional()
        .describe('Filter by beat status'),
    }),
    func: async ({ includeContent, filterStatus }) => {
      let beats = [...state.beatBoard].sort((a, b) => a.sequence - b.sequence)

      if (filterStatus && filterStatus !== 'all') {
        const statusMap: Record<string, BeatStatus> = {
          proposed: BeatStatus.PROPOSED,
          approved: BeatStatus.APPROVED,
          locked: BeatStatus.LOCKED,
        }
        beats = beats.filter(b => b.status === statusMap[filterStatus])
      }

      if (beats.length === 0) {
        return `No beats found${filterStatus && filterStatus !== 'all' ? ` with status "${filterStatus}"` : ''}.`
      }

      const beatList = beats
        .map(b => {
          let line = `[${b.sequence}] ${b.logline} (${b.status}, ${b.beatType})`
          if (includeContent && b.content) {
            line += `\n    Content: ${b.content.substring(0, 200)}...`
          }
          if (b.visualHook) {
            line += `\n    Visual: ${b.visualHook}`
          }
          return line
        })
        .join('\n')

      return `Beat Board (${beats.length} beats):\n\n${beatList}`
    },
  })
}

export const beatManagementTools = [
  // These are factory functions that need state - will be called at runtime
]
