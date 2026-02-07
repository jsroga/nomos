/**
 * Game Mechanic Judge
 *
 * Evaluates the validity and quality of generated game mechanics.
 * Checks for:
 * - Required fields (id, name, type, description)
 * - Valid mechanic types
 * - Transformer validity (inputs/outputs make sense)
 * - Psychological engagement potential
 */

import { BaseLLMJudge, JudgeResult } from './base-judge'
import { ScoreName } from '../engine/scores'

interface GameMechanic {
    id?: string
    name?: string
    type?: string
    description?: string
    transformers?: any[]
    playerInteraction?: string
    inputs?: string[]
    outputs?: string[]
    balanceFactors?: {
        effort?: number
        reward?: number
        frequency?: number
    }
}

interface MechanicEvalInput {
    mechanics?: GameMechanic[]
    genre?: string
    targetAudience?: string
}

interface MechanicEvalExpected {
    shouldGenerateMechanics?: boolean
    expectedMechanicTypes?: string[]
    minMechanicCount?: number
}

const VALID_MECHANIC_TYPES = ['core', 'meta', 'social', 'monetization', 'secondary', 'progression', 'reward']
const VALID_PLAYER_INTERACTIONS = ['active', 'passive', 'automated']

export class GameMechanicJudge extends BaseLLMJudge {
    name = 'GameMechanicJudge'
    scoreName = ScoreName.MECHANIC_VALIDITY

    async evaluate(
        input: MechanicEvalInput,
        output: any,
        expected?: MechanicEvalExpected
    ): Promise<JudgeResult> {
        const mechanics: GameMechanic[] = this.extractMechanics(output)
        const issues: string[] = []
        let totalScore = 0
        let maxScore = 0

        // If we expected mechanics but got none
        if (expected?.shouldGenerateMechanics && mechanics.length === 0) {
            return {
                score: 0,
                scoreName: this.scoreName,
                reason: 'Expected mechanics to be generated, but none were found',
                metadata: { mechanicCount: 0 }
            }
        }

        // If we expected no mechanics but got some (e.g., for questions/destructive commands)
        if (expected?.shouldGenerateMechanics === false && mechanics.length > 0) {
            return {
                score: 0.5, // Partial fail - generated when shouldn't
                scoreName: this.scoreName,
                reason: 'Generated mechanics when none were expected',
                metadata: { mechanicCount: mechanics.length }
            }
        }

        // Check minimum count
        if (expected?.minMechanicCount && mechanics.length < expected.minMechanicCount) {
            issues.push(`Expected at least ${expected.minMechanicCount} mechanics, got ${mechanics.length}`)
        }

        // Evaluate each mechanic
        for (const mechanic of mechanics) {
            const { score, issueList } = this.evaluateMechanic(mechanic)
            totalScore += score
            maxScore += 1
            issues.push(...issueList.map(i => `[${mechanic.name || 'Unknown'}] ${i}`))
        }

        // Check expected mechanic types
        if (expected?.expectedMechanicTypes) {
            const foundTypes = mechanics.map(m => m.type?.toLowerCase()).filter(Boolean)
            const missingTypes = expected.expectedMechanicTypes.filter(
                t => !foundTypes.some(ft => ft?.includes(t.toLowerCase()))
            )
            if (missingTypes.length > 0) {
                issues.push(`Missing expected mechanic types: ${missingTypes.join(', ')}`)
                totalScore -= 0.2 * missingTypes.length
            }
        }

        const finalScore = maxScore > 0 ? this.normalizeScore(totalScore / maxScore) : 1

        return {
            score: finalScore,
            scoreName: this.scoreName,
            reason: issues.length > 0
                ? `Found ${issues.length} issues: ${issues.slice(0, 3).join('; ')}${issues.length > 3 ? '...' : ''}`
                : `All ${mechanics.length} mechanics are valid`,
            metadata: {
                mechanicCount: mechanics.length,
                issueCount: issues.length,
                issues: issues.slice(0, 10)
            }
        }
    }

    private extractMechanics(output: any): GameMechanic[] {
        if (!output) return []

        // Direct array of mechanics
        if (Array.isArray(output)) {
            return output.filter(m => m && typeof m === 'object')
        }

        // Object with mechanics property
        if (output.mechanics && Array.isArray(output.mechanics)) {
            return output.mechanics
        }

        // Payload with mechanics
        if (output.payload?.mechanics && Array.isArray(output.payload.mechanics)) {
            return output.payload.mechanics
        }

        // Result with mechanics
        if (output.result?.mechanics && Array.isArray(output.result.mechanics)) {
            return output.result.mechanics
        }

        // Single mechanic object
        if (output.name && (output.type || output.description)) {
            return [output]
        }

        return []
    }

    private evaluateMechanic(mechanic: GameMechanic): { score: number; issueList: string[] } {
        const issues: string[] = []
        let score = 1

        // Required fields
        if (!mechanic.name || mechanic.name.trim() === '') {
            issues.push('Missing name')
            score -= 0.3
        }

        if (!mechanic.description || mechanic.description.trim() === '') {
            issues.push('Missing description')
            score -= 0.2
        }

        // Valid type
        if (mechanic.type) {
            const typeLC = mechanic.type.toLowerCase()
            if (!VALID_MECHANIC_TYPES.some(t => typeLC.includes(t))) {
                issues.push(`Unknown mechanic type: ${mechanic.type}`)
                score -= 0.1
            }
        } else {
            issues.push('Missing type')
            score -= 0.2
        }

        // Valid player interaction
        if (mechanic.playerInteraction) {
            if (!VALID_PLAYER_INTERACTIONS.includes(mechanic.playerInteraction.toLowerCase())) {
                issues.push(`Invalid player interaction: ${mechanic.playerInteraction}`)
                score -= 0.1
            }
        }

        // Balance factors sanity
        if (mechanic.balanceFactors) {
            const { effort, reward, frequency } = mechanic.balanceFactors
            if (effort !== undefined && (effort < 0 || effort > 10)) {
                issues.push(`Effort out of range: ${effort}`)
                score -= 0.1
            }
            if (reward !== undefined && (reward < 0 || reward > 10)) {
                issues.push(`Reward out of range: ${reward}`)
                score -= 0.1
            }
            if (frequency !== undefined && frequency < 0) {
                issues.push(`Negative frequency: ${frequency}`)
                score -= 0.1
            }
        }

        // Description quality (should be meaningful, not just a word)
        if (mechanic.description && mechanic.description.length < 10) {
            issues.push('Description too short')
            score -= 0.1
        }

        return { score: Math.max(0, score), issueList: issues }
    }
}
