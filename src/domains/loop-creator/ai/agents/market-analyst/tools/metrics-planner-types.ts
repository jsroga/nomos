export interface MetricDefinition {
  name: string
  category: 'engagement' | 'retention' | 'monetization' | 'virality' | 'quality' | 'loop_health'
  description: string
  formula?: string
  importance: 'critical' | 'important' | 'nice_to_have'
  benchmarks: {
    poor: string
    average: string
    good: string
    excellent: string
  }
  applicableGenres: string[]
  measurementTiming: string
  exampleFromGame?: {
    game: string
    value: string
    insight: string
  }
}
