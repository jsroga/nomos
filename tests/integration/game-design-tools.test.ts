
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createGetLoopsTool, createGetLoopByIdTool } from '../../src/domains/game-design/tools/v2/loop-tools'

// Mock the db module that loop-tools imports from
vi.mock('../../src/db', () => ({
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

// Import the mocked db
import { db } from '../../src/db'

describe('Game Design Tools (Integration)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('get_game_loops should return loops for project', async () => {
        const tool = createGetLoopsTool()
        const mockLoops = [{ id: 'loop-1', name: 'Core Loop' }]

            // Setup mock response
            ; (db.query.gameLoops.findMany as any).mockResolvedValueOnce(mockLoops)

        // The execute function receives { context: { ...schema props } } as first arg
        const result = await tool.execute!({ context: { projectId: '00000000-0000-0000-0000-000000000001' } }, {} as any)

        expect(db.query.gameLoops.findMany).toHaveBeenCalled()
        expect(result).toEqual({ success: true, loops: mockLoops })
    })

    it('get_game_loop_by_id should return specific loop', async () => {
        const tool = createGetLoopByIdTool()
        const mockLoop = { id: 'loop-1', name: 'Core Loop' }

            ; (db.query.gameLoops.findFirst as any).mockResolvedValueOnce(mockLoop)

        const result = await tool.execute!({ context: { loopId: '00000000-0000-0000-0000-000000000001' } }, {} as any)

        expect(result).toEqual({ success: true, loop: mockLoop })
    })

    it('get_game_loop_by_id should handle not found', async () => {
        const tool = createGetLoopByIdTool()
            ; (db.query.gameLoops.findFirst as any).mockResolvedValueOnce(null)

        const result = await tool.execute!({ context: { loopId: '00000000-0000-0000-0000-000000000002' } }, {} as any)

        expect(result).toMatchObject({ success: false, error: 'Game loop not found' })
    })
})
