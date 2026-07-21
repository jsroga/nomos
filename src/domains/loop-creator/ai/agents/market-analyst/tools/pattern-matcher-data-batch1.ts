import { z } from 'zod'
import designPatternsBatch1Json from '../data/design-patterns-batch1.json'
import type { DesignPatternDefinition } from './pattern-matcher-analysis'

interface DesignPattern extends DesignPatternDefinition {
  coreElements: string[]
}

const designPatternIndicatorSchema = z.object({
  term: z.string(),
  weight: z.number(),
})

const designPatternSchema = z.object({
  name: z.string(),
  category: z.enum(['loop_structure', 'feedback', 'progression', 'engagement', 'player_experience']),
  description: z.string(),
  coreElements: z.array(z.string()),
  indicators: z.array(designPatternIndicatorSchema),
  antiPatterns: z.array(z.string()),
  examples: z.array(
    z.object({
      game: z.string(),
      implementation: z.string(),
    }),
  ),
  implementationGuide: z.array(z.string()),
  strengths: z.array(z.string()),
  risks: z.array(z.string()),
  compatibility: z.array(z.string()),
})

function parseDesignPatternsBatch1(data: unknown): DesignPattern[] {
  return z.array(designPatternSchema).parse(data)
}

export const DESIGN_PATTERNS_BATCH1 = parseDesignPatternsBatch1(designPatternsBatch1Json)
