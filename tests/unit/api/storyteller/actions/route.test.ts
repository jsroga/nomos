import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/storyteller/actions/route'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Mock dependencies
vi.mock('@/lib/db', () => ({
    db: {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    }
}))

vi.mock('@/lib/auth', () => ({
    requireAuth: vi.fn().mockResolvedValue({ session: { user: { id: 'test-user' } } })
}))

vi.mock('@/domains/storyteller/lib/access-verification', () => ({
    verifyProjectAccess: vi.fn().mockResolvedValue(true),
    verifyEpisodeAccess: vi.fn().mockResolvedValue(true),
}))

// Mock Drizzle specific chain methods
const mockChain = () => {
    const chain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        onConflictDoUpdate: vi.fn().mockReturnThis(),
        then: vi.fn(),
    }
    return chain
}

describe('API Route: Actions Persistence', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        // We need to be careful to simulate the Drizzle query builder pattern
        // select() -> from() -> where() -> limit()
        // insert() -> values() -> onConflictDoUpdate()
        // update() -> set() -> where()

        // Create spies for the chainable methods
        const valuesSpy = vi.fn().mockReturnThis()
        const onConflictSpy = vi.fn().mockReturnThis()

        // Correctly mock a Thenable
        const thenMock = vi.fn((resolve) => {
            if (resolve) resolve([])
            return Promise.resolve([])
        })

        const insertSpy = vi.fn().mockReturnValue({
            values: valuesSpy,
            onConflictDoUpdate: onConflictSpy,
            then: thenMock
        })

        // Assign spy to db.insert
        db.insert = insertSpy as any
        // Also mock update for other paths
        db.update = vi.fn().mockReturnValue({
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            then: thenMock
        }) as any
        db.select = vi.fn().mockReturnValue({
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
                then: thenMock
            }),
        }) as any

    })

    it('should split UPDATE_SERIES_BIBLE payload into seriesBible and storyPlan tables', async () => {
        const payload = {
            action: {
                type: 'UPDATE_SERIES_BIBLE',
                payload: {
                    magicSystem: 'Hard Magic', // Should go to seriesBibles
                    genre: 'Fantasy',          // Should go to storyPlans
                    tone: 'Dark',              // Should go to storyPlans
                }
            },
            projectId: 'test-project-id'
        }

        const req = new NextRequest('http://localhost/api/storyteller/actions', {
            method: 'POST',
            body: JSON.stringify(payload)
        })

        await POST(req)

        // Verify insert calls
        expect(db.insert).toHaveBeenCalledTimes(2)

        // Check arguments passed to values()
        // We expect one call for seriesBibles and one for storyPlans
        // Since we returned the same chain mock, valuesSpy collected all calls.
        expect(db.insert).toHaveBeenCalledTimes(2)

        // Get the values passed to the spy
        // Note: We need to access the spy we created in beforeEach, but since it's re-created, 
        // we should move spy creation inside the test or access it via the mock.
        // However, since we assigned it to db.insert, checking db.insert results (return value) is hard.
        // Better strategy: Use the spy we assigned.

        const insertMock = db.insert as unknown as ReturnType<typeof vi.fn>
        // The spy returns the chain object, which has the values() spy
        const chainObject = insertMock.mock.results[0].value
        const valuesMock = chainObject.values as ReturnType<typeof vi.fn>

        // Extract the arguments from the calls to values()
        const allPayloads = valuesMock.mock.calls.map((call: any[]) => call[0].content || call[0])

        // One should have magicSystem (Series Bible)
        // Note: The structure passed to values() is { projectId, content: {...}, updatedAt }
        // So we need to check the .content property

        const bibleUpdate = allPayloads.find((p: any) => p.magicSystem === 'Hard Magic')
        expect(bibleUpdate).toBeDefined()
        expect(bibleUpdate.genre).toBeUndefined() // should NOT be here

        // One should have genre/tone (Story Plan)
        const planUpdate = allPayloads.find((p: any) => p.genre === 'Fantasy')
        expect(planUpdate).toBeDefined()
        expect(planUpdate.magicSystem).toBeUndefined() // should NOT be here
    })
})
