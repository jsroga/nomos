
import { Plan } from '../schemas'

// ==========================================
// PLANNING DRIFT BENCHMARK
// ==========================================
// Measures how much a plan changes over agent iterations.
// Lower drift = more stable, predictable planning.

export interface DriftMetrics {
    totalIterations: number
    tasksAdded: number
    tasksRemoved: number
    tasksModified: number
    goalChanges: number
    driftScore: number  // 0 = no drift, 1 = complete rewrite
    stability: 'stable' | 'moderate' | 'unstable'
}

export interface PlanSnapshot {
    id: string
    timestamp: Date
    plan: Plan
    goals: string[]
    taskCount: number
}

export class PlanningDriftBenchmark {
    private snapshots: PlanSnapshot[] = []

    /**
     * Record a plan snapshot.
     */
    snapshot(plan: Plan): void {
        this.snapshots.push({
            id: crypto.randomUUID(),
            timestamp: new Date(),
            plan: JSON.parse(JSON.stringify(plan)), // Deep copy
            goals: [plan.goal],
            taskCount: plan.items.length
        })
    }

    /**
     * Calculate drift between two consecutive snapshots.
     */
    private calculatePairwiseDrift(prev: PlanSnapshot, curr: PlanSnapshot): {
        added: number
        removed: number
        modified: number
        goalChanged: boolean
    } {
        const prevIds = new Set(prev.plan.items.map(i => i.id))
        const currIds = new Set(curr.plan.items.map(i => i.id))

        // Count added/removed
        let added = 0
        let removed = 0
        let modified = 0

        for (const id of currIds) {
            if (!prevIds.has(id)) added++
        }

        for (const id of prevIds) {
            if (!currIds.has(id)) removed++
        }

        // Count modified (same ID but different content)
        for (const currItem of curr.plan.items) {
            const prevItem = prev.plan.items.find(i => i.id === currItem.id)
            if (prevItem) {
                if (prevItem.title !== currItem.title ||
                    prevItem.status !== currItem.status ||
                    JSON.stringify(prevItem.dependencies) !== JSON.stringify(currItem.dependencies)) {
                    modified++
                }
            }
        }

        const goalChanged = prev.plan.goal !== curr.plan.goal

        return { added, removed, modified, goalChanged }
    }

    /**
     * Calculate overall drift metrics.
     */
    getMetrics(): DriftMetrics {
        if (this.snapshots.length < 2) {
            return {
                totalIterations: this.snapshots.length,
                tasksAdded: 0,
                tasksRemoved: 0,
                tasksModified: 0,
                goalChanges: 0,
                driftScore: 0,
                stability: 'stable'
            }
        }

        let totalAdded = 0
        let totalRemoved = 0
        let totalModified = 0
        let goalChanges = 0

        for (let i = 1; i < this.snapshots.length; i++) {
            const drift = this.calculatePairwiseDrift(
                this.snapshots[i - 1],
                this.snapshots[i]
            )
            totalAdded += drift.added
            totalRemoved += drift.removed
            totalModified += drift.modified
            if (drift.goalChanged) goalChanges++
        }

        // Calculate drift score (0-1)
        const avgTasks = this.snapshots.reduce((sum, s) => sum + s.taskCount, 0) / this.snapshots.length
        const totalChanges = totalAdded + totalRemoved + totalModified
        const driftScore = Math.min(1, totalChanges / (avgTasks * this.snapshots.length))

        return {
            totalIterations: this.snapshots.length,
            tasksAdded: totalAdded,
            tasksRemoved: totalRemoved,
            tasksModified: totalModified,
            goalChanges,
            driftScore,
            stability: driftScore < 0.2 ? 'stable' : driftScore < 0.5 ? 'moderate' : 'unstable'
        }
    }

    /**
     * Generate a report suitable for logging.
     */
    generateReport(): string {
        const metrics = this.getMetrics()

        return `
=== Planning Drift Report ===
Iterations: ${metrics.totalIterations}
Tasks Added: ${metrics.tasksAdded}
Tasks Removed: ${metrics.tasksRemoved}
Tasks Modified: ${metrics.tasksModified}
Goal Changes: ${metrics.goalChanges}
Drift Score: ${(metrics.driftScore * 100).toFixed(1)}%
Stability: ${metrics.stability.toUpperCase()}
=============================
`.trim()
    }

    /**
     * Compare Story vs Game context drift.
     */
    static compareContexts(storyBench: PlanningDriftBenchmark, gameBench: PlanningDriftBenchmark): {
        storyMetrics: DriftMetrics
        gameMetrics: DriftMetrics
        winner: 'story' | 'game' | 'tie'
        analysis: string
    } {
        const storyMetrics = storyBench.getMetrics()
        const gameMetrics = gameBench.getMetrics()

        let winner: 'story' | 'game' | 'tie'
        if (Math.abs(storyMetrics.driftScore - gameMetrics.driftScore) < 0.05) {
            winner = 'tie'
        } else {
            winner = storyMetrics.driftScore < gameMetrics.driftScore ? 'story' : 'game'
        }

        const analysis = `
Story context drift: ${(storyMetrics.driftScore * 100).toFixed(1)}% (${storyMetrics.stability})
Game context drift: ${(gameMetrics.driftScore * 100).toFixed(1)}% (${gameMetrics.stability})
Winner: ${winner === 'tie' ? 'Tie' : winner + ' (lower drift)'}
`.trim()

        return { storyMetrics, gameMetrics, winner, analysis }
    }

    /**
     * Clear all snapshots.
     */
    clear(): void {
        this.snapshots = []
    }

    /**
     * Export snapshots for external analysis.
     */
    export(): PlanSnapshot[] {
        return [...this.snapshots]
    }
}
