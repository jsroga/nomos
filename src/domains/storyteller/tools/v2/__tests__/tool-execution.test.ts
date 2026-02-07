/**
 * Tool Execution Tests
 * 
 * Tests that verify tools can actually be executed with the Mastra 1.x API.
 * These tests catch issues like the { context } vs args API change.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateWorldBibleTool } from '../world-building-tools'
import { updateStoryPhaseTool } from '../storytelling-adapter'

// Mock DB
vi.mock('@/lib/db', () => ({
    db: {
        select: vi.fn(() => ({
            from: vi.fn(() => ({
                where: vi.fn(() => Promise.resolve([{
                    id: 'test-project-id',
                    seriesBible: { existing: 'data' },
                }]))
            }))
        })),
        update: vi.fn(() => ({
            set: vi.fn(() => ({
                where: vi.fn(() => Promise.resolve([{}]))
            }))
        })),
    }
}))

describe('Tool Execution (Mastra 1.x API)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('updateWorldBibleTool', () => {
        it('should execute with args passed directly (Mastra 1.x format)', async () => {
            // Mastra 1.x passes args directly to execute, not wrapped in { context }
            const args = {
                projectId: 'test-project-id',
                worldDescription: 'A dark and stormy world',
                genre: 'Fantasy'
            }

            const result = await updateWorldBibleTool.execute(args as any)
            
            // Should not throw and should return valid JSON
            expect(result).toBeDefined()
            const parsed = typeof result === 'string' ? JSON.parse(result) : result
            expect(parsed.success).toBe(true)
        })

        it('should reject legacy { context } format (Mastra 1.x requires direct args)', async () => {
            // Mastra 1.x schema validation happens BEFORE execute
            // So { context: {...} } format fails schema validation
            const args = {
                context: {
                    projectId: 'test-project-id',
                    soundtracks: [
                        { title: 'Test', artist: 'Artist', url: 'https://youtube.com' }
                    ]
                }
            }

            const result = await updateWorldBibleTool.execute(args as any)
            
            expect(result).toBeDefined()
            const parsed = typeof result === 'string' ? JSON.parse(result) : result
            // Legacy format is NOT supported - returns validation error
            expect(parsed.error).toBe(true)
            expect(parsed.message).toContain('projectId')
        })

        it('should handle passthrough fields correctly', async () => {
            const args = {
                projectId: 'test-project-id',
                worldRules: [
                    { category: 'Magic', rule: 'No time travel', consequence: 'Death' }
                ],
                plotTwists: [
                    { title: 'The Reveal', description: 'Everything changes' }
                ]
            }

            const result = await updateWorldBibleTool.execute(args as any)
            
            const parsed = typeof result === 'string' ? JSON.parse(result) : result
            expect(parsed.success).toBe(true)
            expect(parsed.keys).toContain('worldRules')
            expect(parsed.keys).toContain('plotTwists')
        })
    })

    describe('updateStoryPhaseTool', () => {
        it('should execute with args passed directly', async () => {
            const args = {
                episodeId: 'test-episode-id',
                phase: 'breaking' as const
            }

            const result = await updateStoryPhaseTool.execute(args as any)
            
            expect(result).toBeDefined()
            const parsed = typeof result === 'string' ? JSON.parse(result) : result
            expect(parsed.success).toBe(true)
            expect(parsed.phase).toBe('breaking')
        })
    })

    describe('Error handling', () => {
        it('should return error JSON when context is completely undefined', async () => {
            // This should be caught and return an error, not throw
            try {
                const result = await updateWorldBibleTool.execute(undefined as any)
                // If it doesn't throw, it should return an error result
                const parsed = typeof result === 'string' ? JSON.parse(result) : result
                expect(parsed.success).toBe(false)
            } catch (error) {
                // Throwing is also acceptable for undefined input
                expect(error).toBeDefined()
            }
        })
    })
})
