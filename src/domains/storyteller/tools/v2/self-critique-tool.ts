/**
 * Self-Critique Tool
 *
 * A Mastra tool that any agent can call to evaluate a draft against
 * GRRM/Gilligan quality standards. Uses pattern matching (no LLM call)
 * for fast, cost-free quality feedback.
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { scoreProseQuality } from '../../guardrails/agent-validators/prose-quality-scorer'
import { validateVisualHook } from '../../guardrails/agent-validators/visual-hook-validator'
import { validateSceneNecessity } from '../../guardrails/agent-validators/scene-necessity'

export const selfCritiqueTool = createTool({
    id: 'self_critique',
    description: 'Evaluate a draft against GRRM/Gilligan quality standards. Call this BEFORE finalizing any scene or beat content. Returns a quality score and specific issues to address.',
    inputSchema: z.object({
        draft: z.string().describe('The draft text to evaluate'),
        criteria: z.enum(['scene', 'dialogue', 'beat', 'premise']).describe('What type of content is being evaluated'),
        logline: z.string().optional().describe('Beat logline for scene necessity check'),
        beatType: z.string().optional().describe('Beat type (setup, complication, revelation, decision, consequence, resolution)'),
    }),
    execute: async (args: any) => {
        const context = args?.context || args
        const draft = context.draft || ''
        const criteria = context.criteria || 'scene'

        // 1. Prose quality (anti-slop)
        const proseResult = scoreProseQuality(draft)

        // 2. Visual hook (for scenes)
        let visualHookResult = null
        if (criteria === 'scene' || criteria === 'beat') {
            visualHookResult = validateVisualHook(draft)
        }

        // 3. Scene necessity (if logline provided)
        let necessityResult = null
        if (context.logline) {
            necessityResult = validateSceneNecessity({
                logline: context.logline,
                content: draft,
                beatType: context.beatType || 'action',
            })
        }

        // Compute overall score
        let overallScore = proseResult.score
        if (visualHookResult) {
            overallScore = (overallScore + visualHookResult.score) / 2
        }
        if (necessityResult) {
            overallScore = (overallScore * 2 + necessityResult.score) / 3
        }

        const shouldRevise = overallScore < 0.7
        const issues: string[] = []

        // Collect issues
        if (proseResult.flags.length > 0) {
            const topFlags = proseResult.flags.slice(0, 5)
            issues.push(`Prose issues: ${topFlags.map(f => `"${f.match}" (${f.description})`).join(', ')}`)
        }

        if (visualHookResult && !visualHookResult.hasVisualHook && visualHookResult.issue) {
            issues.push(`Visual hook: ${visualHookResult.issue}`)
        }

        if (necessityResult && necessityResult.warnings.length > 0) {
            issues.push(...necessityResult.warnings)
        }

        return {
            proseScore: proseResult.score,
            proseCategory: proseResult.category,
            visualHookScore: visualHookResult?.score ?? null,
            hasVisualHook: visualHookResult?.hasVisualHook ?? null,
            necessityScore: necessityResult?.score ?? null,
            overallScore,
            shouldRevise,
            issues,
            suggestion: shouldRevise
                ? `Revise to address: ${issues.slice(0, 3).join('; ')}`
                : 'Quality acceptable - proceed with output',
        }
    },
})
