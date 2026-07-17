/** Competitor database for market analyst competitor finder. */

import { COMPETITOR_DB_BATCH1 } from './competitor-finder-data-batch1'
import { COMPETITOR_DB_BATCH2 } from './competitor-finder-data-batch2'
import type { DetailedCompetitor } from './competitor-finder-types'

export type { DetailedCompetitor } from './competitor-finder-types'

export const COMPETITOR_DB: DetailedCompetitor[] = [
  ...COMPETITOR_DB_BATCH1,
  ...COMPETITOR_DB_BATCH2,
]
