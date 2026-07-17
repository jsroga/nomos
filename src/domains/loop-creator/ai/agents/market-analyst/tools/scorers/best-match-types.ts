export type ArchetypeId = 'disco_elysium' | 'vampire_survivors' | 'counter_strike'

export interface ArchetypeMatch {
  archetype: ArchetypeId
  archetypeName: string
  score: number
  confidence: number
  keyPatterns: string[]
  weakPatterns: string[]
  interpretation: string
  marketImplication: string
}

export interface BestMatchResult {
  success: boolean
  primaryArchetype: ArchetypeMatch
  otherArchetypes: ArchetypeMatch[]
  viabilityVerdict: 'strong' | 'moderate' | 'niche' | 'unclear'
  viabilityReason: string
  recommendation: string
}
