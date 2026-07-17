/**
 * Comprehensive audience psychographic profiles
 */
export interface AudienceProfile {
  id: string
  name: string
  description: string
  size: string // Market size estimate

  // Psychographics
  motivations: string[]
  frustrationsToAvoid: string[]
  valueProportion: string // What they value most

  // Behavioral
  sessionBehavior: {
    preferredLength: string
    frequency: string
    timeOfDay: string
    interruptibility: string
  }

  // Spending
  spendingBehavior: {
    averageSpend: string
    triggers: string[]
    turnoffs: string[]
    preferredModels: string[]
  }

  // Preferences
  gamePreferences: {
    complexity: 'low' | 'medium' | 'high'
    socialRequired: boolean
    competitiveInterest: 'none' | 'casual' | 'serious'
    storyImportance: 'none' | 'light' | 'important' | 'essential'
    replayExpectation: string
  }

  // Matching
  positiveIndicators: { term: string; weight: number }[]
  negativeIndicators: { term: string; weight: number }[]

  // Examples
  gameExamples: string[]

  // Recommendations
  designAdvice: string[]
}
