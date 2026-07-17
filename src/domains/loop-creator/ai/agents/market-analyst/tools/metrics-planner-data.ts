import { METRIC_DATABASE_BATCH1 } from './metrics-planner-metrics-batch1'
import { METRIC_DATABASE_BATCH2 } from './metrics-planner-metrics-batch2'
import { GENRE_METRIC_PRIORITIES } from './metrics-planner-genre-priorities'
import type { MetricDefinition } from './metrics-planner-types'

export type { MetricDefinition } from './metrics-planner-types'
export { GENRE_METRIC_PRIORITIES }

export const METRIC_DATABASE: MetricDefinition[] = [
  ...METRIC_DATABASE_BATCH1,
  ...METRIC_DATABASE_BATCH2,
]
