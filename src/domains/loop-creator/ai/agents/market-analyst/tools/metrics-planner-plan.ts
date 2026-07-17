import {
  GENRE_METRIC_PRIORITIES,
  METRIC_DATABASE,
  type MetricDefinition,
} from './metrics-planner-data'

export interface MetricsPlannerInput {
  gameGenre: string
  gameSubgenre?: string
  businessModel: 'premium' | 'f2p' | 'freemium' | 'subscription'
  platform: 'pc' | 'mobile' | 'console' | 'multi-platform'
  developmentPhase?: 'concept' | 'prototype' | 'production' | 'launch' | 'live'
  focusAreas?: Array<
    'engagement' | 'retention' | 'monetization' | 'virality' | 'quality' | 'loop_health'
  >
}

const PHASE_RECOMMENDATIONS: Record<string, string[]> = {
  concept: [
    'Focus on loop design metrics - ensure core loop is compelling',
    'Benchmark against successful competitors loop metrics',
    'Define target session length based on genre',
  ],
  prototype: [
    'Measure Core Loop Completion Rate in playtests',
    'Track Time to First Win to calibrate difficulty',
    'Watch for friction points in loop transitions',
  ],
  production: [
    'Set up analytics infrastructure now',
    'Define benchmark targets before launch',
    'Plan A/B tests for key metrics',
  ],
  launch: [
    'Monitor D1/D7 retention closely',
    'Watch for unexpected churn points',
    'Track content creator coverage for virality signals',
  ],
  live: [
    'Focus on long-term retention (D30+)',
    'Optimize monetization without hurting retention',
    'Monitor update impact on all key metrics',
  ],
}

function resolvePriorityMetricNames(
  genreLower: string,
  businessModel: MetricsPlannerInput['businessModel'],
  platform: MetricsPlannerInput['platform'],
): string[] {
  let priorityMetricNames: string[] = []

  for (const [genre, metrics] of Object.entries(GENRE_METRIC_PRIORITIES)) {
    if (genre !== 'default' && (genreLower.includes(genre) || genre.includes(genreLower))) {
      priorityMetricNames = metrics
      break
    }
  }

  if (priorityMetricNames.length === 0) {
    priorityMetricNames = GENRE_METRIC_PRIORITIES['default']
  }

  if (businessModel === 'f2p' || businessModel === 'freemium') {
    priorityMetricNames = [...priorityMetricNames, ...GENRE_METRIC_PRIORITIES['f2p']]
  }

  if (platform === 'mobile') {
    priorityMetricNames = [...priorityMetricNames, ...GENRE_METRIC_PRIORITIES['mobile']]
  }

  return [...new Set(priorityMetricNames)].slice(0, 10)
}

function buildCustomMetricSuggestions(
  genreLower: string,
  businessModel: MetricsPlannerInput['businessModel'],
  platform: MetricsPlannerInput['platform'],
): string[] {
  const suggestions: string[] = []

  if (genreLower.includes('roguelike') || genreLower.includes('survivors')) {
    suggestions.push(
      'Run Completion Rate: % of runs that reach natural end vs rage quit',
      'Build Satisfaction Score: Player rating of their final build',
      'Unlock Velocity: Rate of progression unlocks per session',
    )
  }

  if (businessModel === 'f2p') {
    suggestions.push(
      'Paywall Conversion: % converting at each paywall',
      'Ad Skip Rate: % paying to skip ads (if applicable)',
      'Whale Concentration: % of revenue from top 1% spenders',
    )
  }

  if (platform === 'mobile') {
    suggestions.push(
      'Portrait vs Landscape Usage: If applicable',
      'Background Return Rate: % returning after app backgrounded',
      'Notification Response Rate: % engaging with push notifications',
    )
  }

  return suggestions
}

interface QuickReference {
  mustTrack: string[]
  shouldTrack: string[]
  launchTargets: Array<{ metric: string; target: string }>
}

function buildQuickReference(filteredMetrics: MetricDefinition[]): QuickReference {
  const reference: QuickReference = {
    mustTrack: [],
    shouldTrack: [],
    launchTargets: [],
  }

  filteredMetrics.forEach((metric, index) => {
    if (metric.importance === 'critical') {
      reference.mustTrack.push(metric.name)
    }

    if (metric.importance === 'important') {
      reference.shouldTrack.push(metric.name)
    }

    if (index < 3) {
      reference.launchTargets.push({
        metric: metric.name,
        target: metric.benchmarks.good,
      })
    }
  })

  return reference
}

export function planMetrics(input: MetricsPlannerInput) {
  const {
    gameGenre,
    gameSubgenre,
    businessModel,
    platform,
    developmentPhase,
    focusAreas,
  } = input

  const genreLower = gameGenre.toLowerCase()
  const priorityMetricNames = resolvePriorityMetricNames(genreLower, businessModel, platform)

  const priorityMetrics = priorityMetricNames
    .map(name => METRIC_DATABASE.find(metric => metric.name === name))
    .filter((metric): metric is MetricDefinition => metric !== undefined)

  const filteredMetrics =
    focusAreas && focusAreas.length > 0
      ? priorityMetrics.filter(metric => focusAreas.includes(metric.category))
      : priorityMetrics

  const criticalMetrics = METRIC_DATABASE.filter(
    metric => metric.importance === 'critical' && !priorityMetricNames.includes(metric.name),
  ).slice(0, 3)

  return {
    success: true as const,
    gameProfile: {
      genre: gameGenre,
      subgenre: gameSubgenre,
      businessModel,
      platform,
      phase: developmentPhase,
    },
    priorityMetrics: filteredMetrics.map(metric => ({
      name: metric.name,
      category: metric.category,
      importance: metric.importance,
      description: metric.description,
      formula: metric.formula,
      benchmarks: metric.benchmarks,
      measurementTiming: metric.measurementTiming,
      realWorldExample: metric.exampleFromGame,
    })),
    additionalCriticalMetrics: criticalMetrics.map(metric => ({
      name: metric.name,
      category: metric.category,
      description: metric.description,
      benchmarks: metric.benchmarks,
    })),
    phaseRecommendations: developmentPhase
      ? PHASE_RECOMMENDATIONS[developmentPhase]
      : PHASE_RECOMMENDATIONS['concept'],
    customMetricSuggestions: buildCustomMetricSuggestions(genreLower, businessModel, platform),
    targetGuidance: {
      conservative: 'Aim for "average" benchmarks initially',
      ambitious: 'Target "good" benchmarks for launch',
      exceptional: '"Excellent" benchmarks indicate viral potential',
      warning: 'Dont ignore metrics below "poor" threshold - indicates fundamental issues',
    },
    quickReference: buildQuickReference(filteredMetrics),
  }
}
