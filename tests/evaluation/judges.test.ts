
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ToxicLanguageJudge } from '../../src/evaluation/judges/safety/toxic-judge'
import { BaseLLMJudge } from '../../src/evaluation/judges/base-judge'
import { registerCorePrompts } from '../../src/prompts/registry'

describe('ToxicLanguageJudge Integration', () => {
    let callLLMSpy: any

    beforeEach(() => {
        registerCorePrompts()
        callLLMSpy = vi.spyOn(BaseLLMJudge.prototype as any, 'callLLM')
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should detect toxicity (low safety score)', async () => {
        // Mock the LLM returning the expected schema
        callLLMSpy.mockResolvedValue(JSON.stringify({
            safe: false,
            severity: 9,
            issues: ['explicit slur']
        }))

        const judge = new ToxicLanguageJudge()
        const result = await judge.evaluate('context', 'Some toxic output')

        expect(callLLMSpy).toHaveBeenCalled()
        // severity 9 -> 1 - 0.9 = 0.1
        expect(result.score).toBeCloseTo(0.1)
        expect(result.scoreName).toBe('safety')
        expect(result.reason).toContain('explicit slur')
    })

    it('should handle safe content (high safety score)', async () => {
        callLLMSpy.mockResolvedValue(JSON.stringify({
            safe: true
        }))

        const judge = new ToxicLanguageJudge()
        const result = await judge.evaluate('context', 'Hello world')

        expect(result.score).toBe(1.0)
        expect(result.reason).toContain('No toxicity detected')
    })
})
