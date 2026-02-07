
import { describe, it, expect, vi } from 'vitest'
import { createGetLoopsTool, createGetLoopByIdTool } from '../../src/domains/game-design/tools/v2/loop-tools'

// Mock Drizzle
vi.mock('../../../db', () => ({
    db: {
        query: {
            gameLoops: {
                findMany: vi.fn(),
                findFirst: vi.fn(),
            },
            marketAnalyses: {
                findFirst: vi.fn(),
            }
        }
    }
}))

import { db } from '../../src/db'

describe('Game Design Tools (Integration)', () => {
    it('get_game_loops should return loops for project', async () => {
        const tool = createGetLoopsTool()
        const mockLoops = [{ id: 'loop-1', name: 'Core Loop' }]

        // Setup mock response
        vi.mocked(db.query.gameLoops.findMany).mockResolvedValueOnce(mockLoops as any)

        const result = await tool.execute({
            context: { projectId: 'proj-123' },
            suspend: () => Promise.resolve()
        })

        expect(db.query.gameLoops.findMany).toHaveBeenCalled()
        expect(result).toEqual({ success: true, loops: mockLoops })
    })

    it('get_game_loop_by_id should return specific loop', async () => {
        const tool = createGetLoopByIdTool()
        const mockLoop = { id: 'loop-1', name: 'Core Loop' }

        vi.mocked(db.query.gameLoops.findFirst).mockResolvedValueOnce(mockLoop as any)

        const result = await tool.execute({
            context: { loopId: 'loop-1' },
            suspend: () => Promise.resolve()
        })

        expect(result).toEqual({ success: true, loop: mockLoop })
    })

    it('get_game_loop_by_id should handle not found', async () => {
        const tool = createGetLoopByIdTool()
        vi.mocked(db.query.gameLoops.findFirst).mockResolvedValueOnce(null)

        const result = await tool.execute({
            context: { loopId: 'missing' },
            suspend: () => Promise.resolve()
        })

        expect(result).toMatchObject({ success: false, error: 'Game loop not found' })
    })
})
