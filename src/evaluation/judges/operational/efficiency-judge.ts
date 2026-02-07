
import { BaseJudge, JudgeResult } from '../base-judge'
import { ScoreName } from '../../engine/scores'

interface EfficiencyInput {
    quality: number
    costUsd: number
    latencyMs: number
}

export class PlanEfficiencyJudge extends BaseJudge {
    name = 'efficiency-judge'
    scoreName: ScoreName = 'plan_efficiency'

    async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
        // Input should contain metrics
        const metrics = (input as EfficiencyInput) || (output as EfficiencyInput) || {}

        const quality = metrics.quality || 0.5
        const costUsd = metrics.costUsd || 0.0001
        const latencyMs = metrics.latencyMs || 1000
        const latencySec = latencyMs / 1000

        // Formula: Efficiency = (Quality^2) / (Cost*10000 + Latency*0.5)
        const resistance = (costUsd * 10000) + (latencySec * 0.5)
        const rawEfficiency = (Math.pow(quality * 10, 2)) / Math.max(0.1, resistance)

        // Normalize (benchmark ~0.8)
        const score = Math.min(1, rawEfficiency / 20)

        return {
            score,
            reason: `Quality: ${quality.toFixed(2)}, Cost: $${costUsd}, Latency: ${latencySec}s`,
            scoreName: this.scoreName,
            metadata: {
                rawEfficiency,
                resistance,
                quality
            }
        }
    }
}
