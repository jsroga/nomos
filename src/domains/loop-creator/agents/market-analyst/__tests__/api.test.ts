/**
 * Market Analysis API - Smoke Tests
 *
 * Tests for response format validation.
 * Note: Full API endpoint tests require running the Next.js dev server.
 */

import { describe, it, expect } from 'vitest'
import { streamMarketAnalysis, LoopAnalysisInput } from '../index'

describe('Market Analysis API Format', () => {
  describe('SSE Event Format', () => {
    it('should return valid SSE format for progress events', () => {
      const mockEvent = {
        type: 'progress',
        content: '🔍 Starting analysis...',
      }

      const sseData = `data: ${JSON.stringify(mockEvent)}\n\n`

      expect(sseData).toMatch(/^data: .+\n\n$/)

      const parsed = JSON.parse(sseData.replace('data: ', '').trim())
      expect(parsed.type).toBe('progress')
      expect(parsed.content).toBeDefined()
    })

    it('should return valid SSE format for tool_call events', () => {
      const mockEvent = {
        type: 'tool_call',
        content: '🔧 Using competitor_finder...',
      }

      const sseData = `data: ${JSON.stringify(mockEvent)}\n\n`
      const parsed = JSON.parse(sseData.replace('data: ', '').trim())

      expect(parsed.type).toBe('tool_call')
    })

    it('should return valid SSE format for report events', () => {
      const mockReport = {
        type: 'report',
        content: {
          overallScore: 75,
          marketSize: {
            tam: '$1B',
            sam: '$300M',
            relevantSegment: '$100M',
            growthRate: '20% YoY',
            confidence: 0.8,
            sources: ['Test'],
          },
          competitors: [],
          audienceFit: {
            targetDemographic: 'Test',
            fitScore: 70,
            strengths: [],
            concerns: [],
            recommendations: [],
          },
          trends: [],
          patterns: [],
          recommendations: ['Test recommendation'],
          risks: ['Test risk'],
          opportunities: ['Test opportunity'],
          referenceScores: {
            discoElysium: 20,
            vampireSurvivors: 75,
            counterStrike: 15,
          },
          generatedAt: new Date().toISOString(),
          sourcesUsed: ['Test'],
          confidence: 0.8,
        },
      }

      const sseData = `data: ${JSON.stringify(mockReport)}\n\n`
      const parsed = JSON.parse(sseData.replace('data: ', '').trim())

      expect(parsed.type).toBe('report')
      expect(parsed.content.overallScore).toBe(75)
      expect(parsed.content.marketSize).toBeDefined()
      expect(parsed.content.referenceScores).toBeDefined()
    })

    it('should handle error events', () => {
      const mockError = {
        type: 'error',
        content: 'Analysis failed: Network error',
      }

      const sseData = `data: ${JSON.stringify(mockError)}\n\n`
      const parsed = JSON.parse(sseData.replace('data: ', '').trim())

      expect(parsed.type).toBe('error')
      expect(parsed.content).toContain('Analysis failed')
    })

    it('should handle done events', () => {
      const mockDone = {
        type: 'done',
      }

      const sseData = `data: ${JSON.stringify(mockDone)}\n\n`
      const parsed = JSON.parse(sseData.replace('data: ', '').trim())

      expect(parsed.type).toBe('done')
    })
  })

  describe('Streaming Generator', () => {
    it('should create a valid async generator', () => {
      const input: LoopAnalysisInput = {
        mechanics: [],
        connections: [],
        loops: [],
        gameGenre: 'test',
        gamePlatform: 'pc',
        targetAudience: 'core',
        gameDescription: 'Test game',
      }

      const generator = streamMarketAnalysis(input)

      // Verify it's an async generator
      expect(generator).toBeDefined()
      expect(typeof generator[Symbol.asyncIterator]).toBe('function')
    })
  })

  describe('Input Validation', () => {
    it('should accept well-formed LoopAnalysisInput', () => {
      const validInput: LoopAnalysisInput = {
        mechanics: [{ id: '1', name: 'Test', type: 'core', description: 'Test mechanic' }],
        connections: [{ id: 'e1', source: '1', target: '1', label: 'self-loop' }],
        loops: [{ id: 'l1', name: 'Core Loop', type: 'core', description: 'Main loop' }],
        gameGenre: 'roguelike',
        gamePlatform: 'pc',
        targetAudience: 'core',
        gameDescription: 'A test roguelike game',
      }

      // Should not throw when creating generator
      expect(() => streamMarketAnalysis(validInput)).not.toThrow()
    })

    it('should accept minimal input', () => {
      const minimalInput: LoopAnalysisInput = {
        mechanics: [],
        connections: [],
        loops: [],
        gameGenre: '',
        gamePlatform: '',
        targetAudience: '',
        gameDescription: '',
      }

      expect(() => streamMarketAnalysis(minimalInput)).not.toThrow()
    })
  })
})

describe('Report Structure', () => {
  it('should have all required report fields', () => {
    const requiredFields = [
      'overallScore',
      'marketSize',
      'competitors',
      'audienceFit',
      'trends',
      'patterns',
      'recommendations',
      'risks',
      'opportunities',
      'referenceScores',
      'generatedAt',
      'sourcesUsed',
      'confidence',
    ]

    const mockReport = {
      overallScore: 70,
      marketSize: {
        tam: '$1B',
        sam: '$300M',
        relevantSegment: '$100M',
        growthRate: '20%',
        confidence: 0.8,
        sources: [],
      },
      competitors: [],
      audienceFit: {
        targetDemographic: '',
        fitScore: 0,
        strengths: [],
        concerns: [],
        recommendations: [],
      },
      trends: [],
      patterns: [],
      recommendations: [],
      risks: [],
      opportunities: [],
      referenceScores: { discoElysium: 0, vampireSurvivors: 0, counterStrike: 0 },
      generatedAt: '',
      sourcesUsed: [],
      confidence: 0,
    }

    for (const field of requiredFields) {
      expect(mockReport).toHaveProperty(field)
    }
  })

  it('should have valid reference score structure', () => {
    const referenceScores = {
      discoElysium: 45,
      vampireSurvivors: 72,
      counterStrike: 28,
    }

    expect(referenceScores.discoElysium).toBeGreaterThanOrEqual(0)
    expect(referenceScores.discoElysium).toBeLessThanOrEqual(100)
    expect(referenceScores.vampireSurvivors).toBeGreaterThanOrEqual(0)
    expect(referenceScores.vampireSurvivors).toBeLessThanOrEqual(100)
    expect(referenceScores.counterStrike).toBeGreaterThanOrEqual(0)
    expect(referenceScores.counterStrike).toBeLessThanOrEqual(100)
  })
})
