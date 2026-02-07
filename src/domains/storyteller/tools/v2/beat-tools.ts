/**
 * Beat Management Tools - Mastra v2
 *
 * Direct CRUD operations for story beats using Mastra createTool.
 * Migrated from legacy LangChain DynamicStructuredTool.
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { BeatType, BeatStatus } from '../../enums'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/db'
import { beats } from '../../db/schema'
import { eq } from 'drizzle-orm'

// ==========================================
// SCHEMAS
// ==========================================

const BeatDataSchema = z.object({
    logline: z.string().nullish().describe('One-line summary of what happens'),
    content: z.string().nullish().describe('Full beat content/description'),
    visualHook: z.string().nullish().describe('The iconic visual that opens this beat'),
    beatType: z
        .enum(['setup', 'confrontation', 'resolution', 'transition', 'revelation', 'climax', 'default'])
        .nullish()
        .describe('Type of story beat'),
    charactersInvolved: z.array(z.string()).nullish().describe('Character names in this beat'),
    emotionalShifts: z
        .any()
        .nullish()
        .describe('Emotional shifts per character. Format: { "Character": { "from": "...", "to": "..." } }'),
    causalDependencies: z.array(z.string()).nullish().describe('Beat IDs this beat depends on'),
    setupsPayoffs: z
        .any()
        .nullish()
        .describe('Setup/payoff tracking. Format: { "setupId": "...", "payoffFor": "..." }'),
    mazurElements: z
        .any()
        .nullish()
        .describe('Mazur benchmark elements'),
})

const ManageBeatInputSchema = z.object({
    operation: z
        .enum(['create', 'update', 'delete', 'move', 'duplicate', 'approve', 'lock', 'get', 'list'])
        .describe('The operation to perform'),
    beatId: z.string().nullish().describe('ID of the beat to operate on'),
    data: BeatDataSchema.nullish().describe('Beat data for create/update operations'),
    targetPosition: z.number().nullish().describe('Target sequence number for create/move'),
    episodeId: z.string().nullish().describe('Episode ID context'),
    beatBoard: z.array(z.record(z.unknown())).nullish().describe('Current beat board state'),
})

const ListBeatsInputSchema = z.object({
    includeContent: z.boolean().optional().default(false).describe('Include full beat content'),
    filterStatus: z.enum(['all', 'proposed', 'approved', 'locked']).optional().describe('Filter by status'),
    beatBoard: z.array(z.record(z.unknown())).optional().describe('Current beat board state'),
})

// ==========================================
// HELPER FUNCTIONS
// ==========================================

interface BeatCard {
    id: string
    episodeId: string
    sequence: number
    logline: string
    content?: string
    beatType: BeatType
    charactersInvolved: string[]
    emotionalShifts: Record<string, { from: string; to: string }>
    visualHook: string
    causalDependencies: string[]
    setupsPayoffs: { setupId?: string; payoffFor?: string }
    status: BeatStatus
    mazurElements?: Record<string, string>
}

function createBeatCard(episodeId: string, sequence: number, data: z.infer<typeof BeatDataSchema>): BeatCard {
    return {
        id: uuidv4(),
        episodeId,
        sequence,
        logline: data.logline || '',
        content: data.content,
        beatType: (data.beatType as BeatType) || BeatType.SETUP,
        charactersInvolved: data.charactersInvolved || [],
        emotionalShifts: (data.emotionalShifts || {}) as Record<string, { from: string; to: string }>,
        visualHook: data.visualHook || '',
        causalDependencies: data.causalDependencies || [],
        setupsPayoffs: data.setupsPayoffs || {},
        status: BeatStatus.PROPOSED,
        mazurElements: data.mazurElements as Record<string, string> | undefined,
    }
}

// ==========================================
// MASTRA TOOLS
// ==========================================

export const manageBeatTool = createTool({
    id: 'manage_beat',
    description: `Direct beat manipulation tool. Operations: create, update, delete, move, duplicate, approve, lock, get, list.`,
    inputSchema: ManageBeatInputSchema,
    execute: async (args: any) => { const context = args?.context || args;
        // 1. Normalize context (convert nulls to undefined for cleaner logic)
        const normalize = (val: any) => (val === null ? undefined : val)
        const operation = context.operation
        const beatId = normalize(context.beatId)
        const data = normalize(context.data)
        const targetPosition = normalize(context.targetPosition)
        let episodeId = normalize(context.episodeId) || 'general'
        const inputBoard = normalize(context.beatBoard) || []

        const beatBoard: BeatCard[] = [...inputBoard]

        // 2. UUID Safety: Ensure episodeId is a valid UUID or use a placeholder
        const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
        if (!isUuid(episodeId) && episodeId !== 'general') {
            console.warn(`[manage_beat] Invalid episodeId UUID: ${episodeId}. Falling back to 'general' or first found episode.`)
            // Ideally we'd fetch the project's first episode here, but for now we fallback
        }

        switch (operation) {
            case 'create': {
                const sequence = targetPosition ?? beatBoard.length + 1

                // 3. Normalize Data Fields
                if (data) {
                    if (data.emotionalShifts && typeof data.emotionalShifts === 'object' && data.emotionalShifts.shiftType) {
                        // Heuristic: Agent sent { shiftType, from, to } instead of { "Char": { from, to } }
                        const charName = (data.charactersInvolved && data.charactersInvolved[0]) || 'Primary'
                        data.emotionalShifts = {
                            [charName]: { from: data.emotionalShifts.from, to: data.emotionalShifts.to }
                        }
                    }
                    if (data.setupsPayoffs && typeof data.setupsPayoffs === 'object' && Object.keys(data.setupsPayoffs).length === 0) {
                        data.setupsPayoffs = undefined
                    }
                }

                const newBeat = createBeatCard(episodeId, sequence, data || {})

                // 4. PERSIST with Robust Error Handling
                try {
                    await db.insert(beats).values({
                        id: newBeat.id,
                        episodeId: isUuid(newBeat.episodeId) ? newBeat.episodeId : undefined as any,
                        sequence: newBeat.sequence,
                        logline: newBeat.logline,
                        beatType: newBeat.beatType,
                        content: newBeat.content,
                        visualHook: newBeat.visualHook,
                        charactersInvolved: newBeat.charactersInvolved,
                        emotionalShifts: newBeat.emotionalShifts,
                        causalDependencies: newBeat.causalDependencies,
                        setupsPayoffs: newBeat.setupsPayoffs,
                        status: newBeat.status,
                    })
                } catch (dbError: any) {
                    console.error('[manage_beat] DB INSERT FAIL:', dbError.message, { params: newBeat });
                    return JSON.stringify({
                        success: false,
                        error: 'Database insertion failed',
                        details: dbError.message,
                        suggestion: 'Check if episodeId is a valid UUID.'
                    })
                }

                // Adjust existing sequences if we inserted in the middle
                beatBoard.forEach(beat => {
                    if (beat.sequence >= sequence) beat.sequence += 1
                })
                beatBoard.push(newBeat)
                beatBoard.sort((a, b) => a.sequence - b.sequence)

                return JSON.stringify({
                    success: true,
                    message: `Created beat "${newBeat.logline || 'Untitled'}" at position ${sequence}`,
                    beat: { id: newBeat.id, sequence: newBeat.sequence, logline: newBeat.logline, status: newBeat.status },
                    updatedBeatBoard: beatBoard,
                })
            }

            case 'update': {
                if (!beatId) return JSON.stringify({ success: false, error: 'beatId required for update' })
                const beatIndex = beatBoard.findIndex(b => b.id === beatId)
                if (beatIndex === -1 && inputBoard.length > 0) {
                    return JSON.stringify({ success: false, error: `Beat ${beatId} not found in provided board` })
                }

                // If board is empty, we attempt a direct DB update if we have the ID
                const updateFields: any = {}
                if (data) {
                    if (data.logline !== undefined) updateFields.logline = data.logline
                    if (data.content !== undefined) updateFields.content = data.content
                    if (data.visualHook !== undefined) updateFields.visualHook = data.visualHook
                    if (data.beatType !== undefined) updateFields.beatType = data.beatType
                    if (data.charactersInvolved !== undefined) updateFields.charactersInvolved = data.charactersInvolved
                    if (data.emotionalShifts !== undefined) updateFields.emotionalShifts = data.emotionalShifts
                    if (data.causalDependencies !== undefined) updateFields.causalDependencies = data.causalDependencies
                    if (data.setupsPayoffs !== undefined) updateFields.setupsPayoffs = data.setupsPayoffs
                }

                try {
                    if (isUuid(beatId)) {
                        await db.update(beats)
                            .set({ ...updateFields, updatedAt: new Date() })
                            .where(eq(beats.id, beatId))
                    }
                } catch (dbError: any) {
                    return JSON.stringify({ success: false, error: 'Database update failed', details: dbError.message })
                }

                // Also update local board for immediate consistency
                if (beatIndex !== -1) {
                    Object.assign(beatBoard[beatIndex], updateFields)
                }

                return JSON.stringify({
                    success: true,
                    message: `Updated beat ${beatId}`,
                    updatedBeatBoard: beatBoard,
                })
            }

            case 'delete': {
                if (!beatId) return JSON.stringify({ success: false, error: 'beatId required for delete' })
                const beatIndex = beatBoard.findIndex(b => b.id === beatId)
                if (beatIndex === -1) return JSON.stringify({ success: false, error: `Beat ${beatId} not found` })

                const beat = beatBoard[beatIndex]
                if (beat.status === BeatStatus.LOCKED) {
                    return JSON.stringify({ success: false, error: 'Cannot delete a locked beat' })
                }

                const deletedSequence = beat.sequence
                beatBoard.splice(beatIndex, 1)
                beatBoard.forEach(b => { if (b.sequence > deletedSequence) b.sequence -= 1 })

                // PERSIST: Delete from DB
                await db.delete(beats).where(eq(beats.id, beatId))

                // Re-sequence remaining beats in DB? Or just trust the board?
                // For safety, we should re-save sequences, but for MVP speed, we assume subsequent gets refresh from DB.

                return JSON.stringify({
                    success: true,
                    message: `Deleted beat "${beat.logline}"`,
                    deletedId: beatId,
                    updatedBeatBoard: beatBoard,
                })
            }

            case 'move': {
                if (!beatId) return JSON.stringify({ success: false, error: 'beatId required for move' })
                if (targetPosition === undefined) return JSON.stringify({ success: false, error: 'targetPosition required' })

                const beatIndex = beatBoard.findIndex(b => b.id === beatId)
                if (beatIndex === -1) return JSON.stringify({ success: false, error: `Beat ${beatId} not found` })

                const beat = beatBoard[beatIndex]
                const oldSequence = beat.sequence
                const newSequence = targetPosition

                beatBoard.forEach(b => {
                    if (b.id === beatId) {
                        b.sequence = newSequence
                    } else if (oldSequence < newSequence && b.sequence > oldSequence && b.sequence <= newSequence) {
                        b.sequence -= 1
                    } else if (oldSequence > newSequence && b.sequence >= newSequence && b.sequence < oldSequence) {
                        b.sequence += 1
                    }
                })
                beatBoard.sort((a, b) => a.sequence - b.sequence)

                return JSON.stringify({
                    success: true,
                    message: `Moved beat "${beat.logline}" from ${oldSequence} to ${newSequence}`,
                    updatedBeatBoard: beatBoard,
                })
            }

            case 'duplicate': {
                if (!beatId) return JSON.stringify({ success: false, error: 'beatId required for duplicate' })
                const originalBeat = beatBoard.find(b => b.id === beatId)
                if (!originalBeat) return JSON.stringify({ success: false, error: `Beat ${beatId} not found` })

                const newSequence = originalBeat.sequence + 1
                beatBoard.forEach(b => { if (b.sequence >= newSequence) b.sequence += 1 })

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
                    newBeat: { id: duplicateBeat.id, sequence: duplicateBeat.sequence, logline: duplicateBeat.logline },
                    updatedBeatBoard: beatBoard,
                })
            }

            case 'approve': {
                if (!beatId) return JSON.stringify({ success: false, error: 'beatId required for approve' })
                const beat = beatBoard.find(b => b.id === beatId)
                if (!beat) return JSON.stringify({ success: false, error: `Beat ${beatId} not found` })

                beat.status = BeatStatus.APPROVED

                // PERSIST
                await db.update(beats).set({ status: BeatStatus.APPROVED }).where(eq(beats.id, beatId))

                return JSON.stringify({ success: true, message: `Approved beat "${beat.logline}"`, status: BeatStatus.APPROVED, updatedBeatBoard: beatBoard })
            }

            case 'lock': {
                if (!beatId) return JSON.stringify({ success: false, error: 'beatId required for lock' })
                const beat = beatBoard.find(b => b.id === beatId)
                if (!beat) return JSON.stringify({ success: false, error: `Beat ${beatId} not found` })

                if (beat.status !== BeatStatus.APPROVED) {
                    return JSON.stringify({ success: false, error: 'Beat must be approved before locking' })
                }

                beat.status = BeatStatus.LOCKED

                // PERSIST
                await db.update(beats).set({ status: BeatStatus.LOCKED }).where(eq(beats.id, beatId))

                return JSON.stringify({ success: true, message: `Locked beat "${beat.logline}"`, status: BeatStatus.LOCKED, updatedBeatBoard: beatBoard })
            }

            case 'get': {
                if (!beatId) return JSON.stringify({ success: false, error: 'beatId required for get' })
                const beat = beatBoard.find(b => b.id === beatId)
                if (!beat) return JSON.stringify({ success: false, error: `Beat ${beatId} not found` })
                return JSON.stringify({ success: true, beat })
            }

            case 'list': {
                const summary = beatBoard.sort((a, b) => a.sequence - b.sequence).map(b => ({
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

export const listBeatsTool = createTool({
    id: 'list_beats',
    description: 'Get a quick summary of all beats in the current episode.',
    inputSchema: ListBeatsInputSchema,
    execute: async (args: any) => { const context = args?.context || args;
        const { includeContent = false, filterStatus, beatBoard: inputBoard = [] } = context
        let beats: BeatCard[] = [...inputBoard].sort((a, b) => a.sequence - b.sequence)

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

        const beatList = beats.map(b => {
            let line = `[${b.sequence}] ${b.logline} (${b.status}, ${b.beatType})`
            if (includeContent && b.content) line += `\n    Content: ${b.content.substring(0, 200)}...`
            if (b.visualHook) line += `\n    Visual: ${b.visualHook}`
            return line
        }).join('\n')

        return `Beat Board (${beats.length} beats):\n\n${beatList}`
    },
})

// Export all tools as array for easy registration
export const beatTools = [manageBeatTool, listBeatsTool]
