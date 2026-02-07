/**
 * Economy Health Judge
 *
 * Evaluates the overall health of a game's resource economy.
 * Checks for:
 * - Resource sinks and sources balance
 * - Inflation/deflation detection
 * - Currency stability
 * - Premium currency fairness
 * - Resource scarcity appropriateness
 */

import { BaseJudge, JudgeResult } from './base-judge'
import { ScoreName } from '../engine/scores'

interface Resource {
    id?: string
    name?: string
    type?: string
    initialValue?: number
    generationRate?: number
    consumptionRate?: number
}

interface EconomyAnalysis {
    economyHealth?: 'healthy' | 'inflationary' | 'deflationary' | 'broken'
    overallScore?: number
    issues?: Array<{
        type?: string
        description?: string
        severity?: string
    }>
    resourcesAtSessionEnd?: Record<string, number>
}

interface EconomyEvalInput {
    resources?: Resource[]
    mechanics?: any[]
    sessionDurationMinutes?: number
    targetAudience?: string
}

interface EconomyEvalExpected {
    expectedHealth?: 'healthy' | 'inflationary' | 'deflationary'
    maxInflationRate?: number
    shouldHaveSinks?: boolean
}

export class EconomyHealthJudge extends BaseJudge {
    name = 'EconomyHealthJudge'
    scoreName = ScoreName.ECONOMY_HEALTH

    async evaluate(
        input: EconomyEvalInput,
        output: any,
        expected?: EconomyEvalExpected
    ): Promise<JudgeResult> {
        const analysis = this.extractEconomyAnalysis(output)
        const resources = input.resources || this.extractResources(output)
        const issues: string[] = []
        let score = 1

        // Check economy health status
        if (analysis?.economyHealth) {
            const health = analysis.economyHealth.toLowerCase()

            if (expected?.expectedHealth) {
                if (health !== expected.expectedHealth.toLowerCase()) {
                    issues.push(`Expected ${expected.expectedHealth} economy, got ${health}`)
                    score -= 0.3
                }
            }

            // Score based on health
            switch (health) {
                case 'healthy':
                    // No penalty
                    break
                case 'inflationary':
                    issues.push('Economy is inflationary - resources accumulate too quickly')
                    score -= 0.3
                    break
                case 'deflationary':
                    issues.push('Economy is deflationary - resources too scarce')
                    score -= 0.3
                    break
                case 'broken':
                    issues.push('Economy is broken - fundamental imbalance')
                    score -= 0.5
                    break
            }
        }

        // Analyze resource balance
        if (resources.length > 0) {
            const resourceIssues = this.analyzeResourceBalance(resources, input)
            issues.push(...resourceIssues.issues)
            score -= resourceIssues.penalty
        }

        // Check for sinks if expected
        if (expected?.shouldHaveSinks) {
            const hasSinks = this.hasSufficientSinks(resources, output)
            if (!hasSinks) {
                issues.push('Economy lacks sufficient resource sinks')
                score -= 0.2
            }
        }

        // Check analysis issues
        if (analysis?.issues) {
            const resourceDrought = analysis.issues.filter(i => i.type === 'resource_drought')
            const resourceFlood = analysis.issues.filter(i => i.type === 'resource_flood')

            if (resourceDrought.length > 0) {
                issues.push(`${resourceDrought.length} resources in drought`)
                score -= 0.1 * resourceDrought.length
            }

            if (resourceFlood.length > 0) {
                issues.push(`${resourceFlood.length} resources in flood`)
                score -= 0.1 * resourceFlood.length
            }
        }

        // Session end state check
        if (analysis?.resourcesAtSessionEnd) {
            const sessionIssues = this.checkSessionEndState(
                analysis.resourcesAtSessionEnd,
                resources,
                input.targetAudience
            )
            issues.push(...sessionIssues.issues)
            score -= sessionIssues.penalty
        }

        return {
            score: this.normalizeScore(score),
            scoreName: this.scoreName,
            reason: issues.length > 0
                ? `Economy issues: ${issues.slice(0, 3).join('; ')}${issues.length > 3 ? '...' : ''}`
                : `Economy appears healthy${analysis?.economyHealth ? ` (${analysis.economyHealth})` : ''}`,
            metadata: {
                economyHealth: analysis?.economyHealth,
                resourceCount: resources.length,
                issueCount: issues.length,
                issues: issues.slice(0, 10)
            }
        }
    }

    private extractEconomyAnalysis(output: any): EconomyAnalysis | null {
        if (!output) return null
        if (output.economyHealth !== undefined) return output
        if (output.payload?.balanceAnalysis) return output.payload.balanceAnalysis
        if (output.result?.balanceAnalysis) return output.result.balanceAnalysis
        return null
    }

    private extractResources(output: any): Resource[] {
        if (!output) return []
        if (output.resources) return output.resources
        if (output.payload?.resources) return output.payload.resources
        return []
    }

    private analyzeResourceBalance(
        resources: Resource[],
        input: EconomyEvalInput
    ): { issues: string[]; penalty: number } {
        const issues: string[] = []
        let penalty = 0

        for (const resource of resources) {
            if (resource.generationRate !== undefined && resource.consumptionRate !== undefined) {
                const netRate = resource.generationRate - resource.consumptionRate

                // Check for extreme imbalances
                if (netRate > 0 && resource.generationRate > 0) {
                    const inflationRatio = netRate / resource.generationRate
                    if (inflationRatio > 0.5) {
                        issues.push(`${resource.name}: High inflation (${(inflationRatio * 100).toFixed(0)}% excess)`)
                        penalty += 0.1
                    }
                } else if (netRate < 0 && resource.consumptionRate > 0) {
                    const deflationRatio = Math.abs(netRate) / resource.consumptionRate
                    if (deflationRatio > 0.5) {
                        issues.push(`${resource.name}: High deflation (${(deflationRatio * 100).toFixed(0)}% deficit)`)
                        penalty += 0.1
                    }
                }
            }

            // Check for premium currency issues
            if (resource.type === 'currency' && resource.name?.toLowerCase().includes('premium')) {
                // Premium currencies should be scarce
                if (resource.generationRate && resource.generationRate > 10) {
                    issues.push(`${resource.name}: Premium currency generation too high`)
                    penalty += 0.15
                }
            }
        }

        return { issues, penalty: Math.min(penalty, 0.4) }
    }

    private hasSufficientSinks(resources: Resource[], output: any): boolean {
        // Check if there are consuming mechanics
        const mechanics = output?.mechanics || output?.payload?.mechanics || []

        let hasSink = false
        for (const mechanic of mechanics) {
            const transformers = mechanic.transformers || []
            for (const transformer of transformers) {
                if (transformer.type === 'sink' || transformer.type === 'converter') {
                    hasSink = true
                    break
                }
                if (transformer.inputs && transformer.inputs.length > 0) {
                    hasSink = true
                    break
                }
            }
            if (hasSink) break
        }

        // Also check consumption rates
        if (!hasSink) {
            for (const resource of resources) {
                if (resource.consumptionRate && resource.consumptionRate > 0) {
                    hasSink = true
                    break
                }
            }
        }

        return hasSink
    }

    private checkSessionEndState(
        endState: Record<string, number>,
        resources: Resource[],
        targetAudience?: string
    ): { issues: string[]; penalty: number } {
        const issues: string[] = []
        let penalty = 0

        for (const [resourceName, endValue] of Object.entries(endState)) {
            const resource = resources.find(r => r.name === resourceName || r.id === resourceName)

            if (resource?.initialValue !== undefined) {
                const changeRatio = (endValue - resource.initialValue) / (resource.initialValue || 1)

                // Casual players should feel progress
                if (targetAudience === 'casual') {
                    if (changeRatio < 0.1) {
                        issues.push(`${resourceName}: Casual players may feel no progress`)
                        penalty += 0.1
                    }
                }

                // Check for excessive accumulation
                if (changeRatio > 5) {
                    issues.push(`${resourceName}: Excessive accumulation (${(changeRatio * 100).toFixed(0)}% increase)`)
                    penalty += 0.15
                }
            }

            // Zero resource at end is usually bad
            if (endValue <= 0) {
                issues.push(`${resourceName}: Resource depleted by session end`)
                penalty += 0.1
            }
        }

        return { issues, penalty: Math.min(penalty, 0.3) }
    }
}
