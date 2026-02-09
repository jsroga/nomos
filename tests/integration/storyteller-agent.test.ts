/**
 * StorytellerAgent Integration Tests
 *
 * Tests for the Mastra-based StorytellerAgent and v2 tools.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to ensure the mock object is available during hoisting
const { mockDb } = vi.hoisted(() => ({
    mockDb: {
        insert: vi.fn().mockImplementation(() => ({
            values: vi.fn().mockResolvedValue({ success: true }),
        })),
        update: vi.fn().mockImplementation(() => ({
            set: vi.fn().mockImplementation(() => ({
                where: vi.fn().mockResolvedValue({ success: true }),
            })),
        })),
        query: {
            beats: {
                findMany: vi.fn().mockResolvedValue([]),
                findFirst: vi.fn().mockResolvedValue(null),
            },
        },
    }
}))

// Mock Drizzle modules for all possible import paths
vi.mock('../../src/db', () => ({ db: mockDb }))
vi.mock('../../src/db/index', () => ({ db: mockDb }))
vi.mock('../../src/lib/db', () => ({ db: mockDb }))
vi.mock('@/db', () => ({ db: mockDb }))
vi.mock('@/lib/db', () => ({ db: mockDb }))

import {
    manageBeatTool,
    listBeatsTool,
    analyzeRelationshipsTool,
    checkContinuityTool,
    quickConsistencyCheckTool,
} from '../../src/domains/storyteller/tools/v2'
import { BeatStatus, BeatType } from '../../src/domains/storyteller/enums'

// Helper to parse tool result whether it's a string or object
function parseResult(result: any): any {
    if (typeof result === 'string') {
        return JSON.parse(result)
    }
    return result
}

describe('Storyteller v2 Tools Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Beat Management Tools', () => {
        it('should create a new beat', async () => {
            const result = await manageBeatTool.execute!(
                {
                    operation: 'create',
                    data: {
                        logline: 'Hero discovers a mysterious map',
                        content: 'In the dusty attic, Sarah finds a weathered map.',
                        charactersInvolved: ['Sarah'],
                        beatType: BeatType.SETUP,
                        visualHook: 'Dust motes dancing in sunlight',
                    },
                    episodeId: '00000000-0000-0000-0000-000000000001',
                    beatBoard: [],
                },
                {} as any
            )

            const parsed = parseResult(result)
            expect(parsed.success).toBe(true)
            expect(parsed.beat).toBeDefined()
            expect(parsed.beat.logline).toBe('Hero discovers a mysterious map')
            expect(parsed.beat.sequence).toBe(1)
        })

        it('should list beats filtered by status', async () => {
            const mockBeats = [
                { id: '1', logline: 'Beat 1', status: BeatStatus.PROPOSED, sequence: 1, beatType: 'setup' },
                { id: '2', logline: 'Beat 2', status: BeatStatus.APPROVED, sequence: 2, beatType: 'setup' },
                { id: '3', logline: 'Beat 3', status: BeatStatus.PROPOSED, sequence: 3, beatType: 'setup' },
            ]

            const result = await listBeatsTool.execute!(
                {
                    filterStatus: BeatStatus.PROPOSED,
                    beatBoard: mockBeats,
                },
                {} as any
            )

            // listBeatsTool returns text format, not JSON
            const output = result as string
            expect(output).toContain('Beat Board')
            expect(output).toContain('2 beats')
            expect(output).toContain('Beat 1')
            expect(output).toContain('Beat 3')
            expect(output).not.toContain('Beat 2') // Beat 2 is APPROVED, not PROPOSED
        })

        it('should update a beat', async () => {
            const mockBeats = [
                { id: 'beat-1', logline: 'Original logline', content: '', status: BeatStatus.PROPOSED, sequence: 1 },
            ]

            const result = await manageBeatTool.execute!(
                {
                    operation: 'update',
                    beatId: 'beat-1',
                    data: {
                        logline: 'Updated logline',
                    },
                    beatBoard: mockBeats,
                },
                {} as any
            )

            const parsed = parseResult(result)
            expect(parsed.success).toBe(true)
            // Update returns updatedBeatBoard, not beat
            expect(parsed.updatedBeatBoard[0].logline).toBe('Updated logline')
        })
    })

    describe('Continuity Tools', () => {
        it('should pass beats with no issues', async () => {
            const mockBeats = [
                {
                    id: '1',
                    sequence: 1,
                    logline: 'Hero arrives in the village',
                    charactersInvolved: ['Hero'],
                    status: BeatStatus.APPROVED,
                },
                {
                    id: '2',
                    sequence: 2,
                    logline: 'Hero meets the blacksmith',
                    charactersInvolved: ['Hero', 'Blacksmith'],
                    status: BeatStatus.APPROVED,
                },
            ]

            const result = await checkContinuityTool.execute!(
                {
                    scope: 'all_beats',
                    checkTypes: ['all'],
                    autoFix: false,
                    beatBoard: mockBeats,
                    characters: [],
                    seriesBible: {},
                    unresolvedSetups: [],
                },
                {} as any
            )

            const parsed = parseResult(result)
            expect(parsed.success).toBe(true)
            expect(parsed.issues.length).toBe(0)
        })

        it('should detect world rule violations', async () => {
            const mockBeats = [
                {
                    id: '1',
                    sequence: 1,
                    logline: 'The wizard teleports across the kingdom',
                    charactersInvolved: ['Wizard'],
                    status: BeatStatus.PROPOSED,
                },
            ]

            const seriesBible = {
                worldRules: [
                    { rule: 'Characters cannot teleport in this world', consequence: 'Rewrite with travel' },
                ],
            }

            const result = await checkContinuityTool.execute!(
                {
                    scope: 'all_beats',
                    checkTypes: ['world_rules'],
                    autoFix: false,
                    beatBoard: mockBeats,
                    characters: [],
                    seriesBible,
                    unresolvedSetups: [],
                },
                {} as any
            )

            const parsed = parseResult(result)
            expect(parsed.success).toBe(true)
        })

        it('should perform quick consistency check', async () => {
            const result = await quickConsistencyCheckTool.execute!(
                {
                    statement: 'The hero walks to the castle.',
                    charactersInvolved: ['Hero'],
                    seriesBible: {},
                    characters: [],
                },
                {} as any
            )

            const parsed = parseResult(result)
            expect(parsed.pass).toBe(true)
        })
    })

    describe('Character Relationship Tools', () => {
        it('should analyze relationships between characters', async () => {
            const mockCharacters = [
                {
                    name: 'Alice',
                    currentGoals: ['Find truth'],
                    fears: ['Betrayal'],
                    metrics: { valence: 50, arousal: 50, dominance: 50, autonomy: 50, competence: 50, relatedness: 50, transformation: 50 },
                },
                {
                    name: 'Bob',
                    currentGoals: ['Protect family'],
                    fears: ['Failure'],
                    metrics: { valence: 50, arousal: 50, dominance: 50, autonomy: 50, competence: 50, relatedness: 50, transformation: 50 },
                },
            ]

            const mockBeats = [
                {
                    id: '1',
                    sequence: 1,
                    logline: 'Alice and Bob argue about the plan',
                    charactersInvolved: ['Alice', 'Bob'],
                    emotionalShifts: {
                        Alice: { from: 'confident', to: 'frustrated' },
                        Bob: { from: 'calm', to: 'defensive' },
                    },
                    status: BeatStatus.APPROVED,
                },
            ]

            const result = await analyzeRelationshipsTool.execute!(
                {
                    focus: 'full_matrix',
                    characters: mockCharacters,
                    beatBoard: mockBeats,
                    seriesBible: {},
                },
                {} as any
            )

            const parsed = parseResult(result)
            expect(parsed.success).toBe(true)
            expect(parsed.totalCharacters).toBe(2)
        })
    })
})

describe('Storyteller Workflow Integration', () => {
    it('should export workflow function', async () => {
        const { runStorytellerWorkflow } = await import(
            '../../src/domains/storyteller/workflows/storyteller-workflow'
        )
        expect(typeof runStorytellerWorkflow).toBe('function')
    })
})
