
import { CoPilotInteraction } from '../executive'

// ==========================================
// HUMAN-IN-THE-LOOP MIDDLEWARE
// ==========================================
// Provides universal checkpoint and approval logic.
// Can be injected into any ExecutiveAgent-based planner.

export type ApprovalStatus = 'approved' | 'rejected' | 'pending' | 'timeout'

export interface Checkpoint {
    id: string
    type: 'plan_approval' | 'execution_confirmation' | 'risk_warning' | 'custom'
    interaction: CoPilotInteraction
    timestamp: Date
    status: ApprovalStatus
    userResponse?: string
}

export interface HITLConfig {
    requireApprovalFor: ('PROPOSE_PLAN' | 'EXECUTE_STEP' | 'ASK_USER')[]
    timeoutMs: number
    onCheckpoint: (checkpoint: Checkpoint) => Promise<ApprovalStatus>
}

export class HumanInTheLoop {
    private config: HITLConfig
    private checkpoints: Checkpoint[] = []

    constructor(config: HITLConfig) {
        this.config = config
    }

    /**
     * Wraps an agent interaction with approval checkpoints.
     */
    async process(interaction: CoPilotInteraction): Promise<CoPilotInteraction & { approved: boolean }> {
        // Check if this interaction type requires approval
        if (!this.config.requireApprovalFor.includes(interaction.type as any)) {
            return { ...interaction, approved: true }
        }

        // Create checkpoint
        const checkpoint: Checkpoint = {
            id: crypto.randomUUID(),
            type: this.getCheckpointType(interaction),
            interaction: interaction,
            timestamp: new Date(),
            status: 'pending'
        }

        this.checkpoints.push(checkpoint)

        // Request approval via callback
        try {
            const timeoutPromise = new Promise<ApprovalStatus>((_, reject) =>
                setTimeout(() => reject(new Error('Approval timeout')), this.config.timeoutMs)
            )

            const approvalPromise = this.config.onCheckpoint(checkpoint)

            checkpoint.status = await Promise.race([approvalPromise, timeoutPromise])
        } catch (e) {
            checkpoint.status = 'timeout'
        }

        return {
            ...interaction,
            approved: checkpoint.status === 'approved'
        }
    }

    private getCheckpointType(interaction: CoPilotInteraction): Checkpoint['type'] {
        switch (interaction.type) {
            case 'PROPOSE_PLAN': return 'plan_approval'
            case 'EXECUTE_STEP': return 'execution_confirmation'
            case 'ASK_USER': return 'custom'
            default: return 'custom'
        }
    }

    /**
     * Get all checkpoints for audit trail.
     */
    getCheckpoints(): Checkpoint[] {
        return [...this.checkpoints]
    }

    /**
     * Clear checkpoint history.
     */
    clearHistory(): void {
        this.checkpoints = []
    }
}

// ==========================================
// INTERRUPT HANDLING
// ==========================================
// Universal pause/resume logic for any agent loop.

export class InterruptController {
    private paused: boolean = false
    private pausePromise: Promise<void> | null = null
    private resumeResolver: (() => void) | null = null

    pause(): void {
        if (this.paused) return
        this.paused = true
        this.pausePromise = new Promise(resolve => {
            this.resumeResolver = resolve
        })
        console.log('🛑 Agent paused.')
    }

    resume(): void {
        if (!this.paused) return
        this.paused = false
        if (this.resumeResolver) {
            this.resumeResolver()
            this.resumeResolver = null
            this.pausePromise = null
        }
        console.log('▶️ Agent resumed.')
    }

    async waitIfPaused(): Promise<void> {
        if (this.paused && this.pausePromise) {
            await this.pausePromise
        }
    }

    isPaused(): boolean {
        return this.paused
    }
}
