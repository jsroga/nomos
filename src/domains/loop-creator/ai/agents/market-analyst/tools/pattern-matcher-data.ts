import { DESIGN_PATTERNS_BATCH1 } from './pattern-matcher-data-batch1'
import { DESIGN_PATTERNS_BATCH2 } from './pattern-matcher-data-batch2'
import type { DesignPatternDefinition } from './pattern-matcher-analysis'

interface DesignPattern extends DesignPatternDefinition {
  coreElements: string[]
}

export const DESIGN_PATTERNS: DesignPattern[] = [
  ...DESIGN_PATTERNS_BATCH1,
  ...DESIGN_PATTERNS_BATCH2,
]
