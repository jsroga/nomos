
import { Plan, PlanSchema } from '../schemas'
import { PlanPersistence } from '../planner'
import * as fs from 'fs/promises'
import * as path from 'path'

// ==========================================
// JSON FILE PERSISTENCE
// ==========================================
// A simple file-based persistence adapter for Plans.
// Suitable for local development and CLI tools.

export class JsonFilePersistence implements PlanPersistence {
    private filePath: string

    constructor(filePath: string) {
        this.filePath = filePath
    }

    async loadPlan(): Promise<Plan | null> {
        try {
            const data = await fs.readFile(this.filePath, 'utf-8')
            const parsed = JSON.parse(data)
            // Validate with Zod
            return PlanSchema.parse(parsed)
        } catch {
            return null
        }
    }

    async savePlan(plan: Plan): Promise<void> {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true })
        await fs.writeFile(this.filePath, JSON.stringify(plan, null, 2))
    }
}

// ==========================================
// MEMORY PERSISTENCE
// ==========================================
// In-memory persistence for testing or ephemeral agents.

export class MemoryPersistence implements PlanPersistence {
    private plan: Plan | null = null

    async loadPlan(): Promise<Plan | null> {
        return this.plan
    }

    async savePlan(plan: Plan): Promise<void> {
        this.plan = { ...plan }
    }

    clear(): void {
        this.plan = null
    }
}

// ==========================================
// EXECUTIVE STATE PERSISTENCE
// ==========================================
// Stores the full agent state including thoughts and errors.

import { ExecutiveState, ExecutiveStateSchema } from '../schemas'

export interface StatePersistence {
    loadState(): Promise<ExecutiveState | null>
    saveState(state: ExecutiveState): Promise<void>
}

export class JsonStatePersistence implements StatePersistence {
    private filePath: string

    constructor(filePath: string) {
        this.filePath = filePath
    }

    async loadState(): Promise<ExecutiveState | null> {
        try {
            const data = await fs.readFile(this.filePath, 'utf-8')
            const parsed = JSON.parse(data)
            return ExecutiveStateSchema.parse(parsed)
        } catch {
            return null
        }
    }

    async saveState(state: ExecutiveState): Promise<void> {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true })
        await fs.writeFile(this.filePath, JSON.stringify(state, null, 2))
    }
}

// ==========================================
// PERSISTENCE FACTORY
// ==========================================
// Helper to create persistence adapters based on configuration.

export type PersistenceType = 'json' | 'memory'

export function createPlanPersistence(type: PersistenceType, options?: { filePath?: string }): PlanPersistence {
    switch (type) {
        case 'json':
            if (!options?.filePath) throw new Error('filePath required for JSON persistence')
            return new JsonFilePersistence(options.filePath)
        case 'memory':
            return new MemoryPersistence()
        default:
            throw new Error(`Unknown persistence type: ${type}`)
    }
}
