/**
 * The three narrow critics (StoryForge topology): continuity, prose, stakes.
 * Diagnose only — quoted evidence, never replacement prose.
 */

import '@/shared/data/server-guard'

export { continuityCritic } from './continuity-critic'
export { proseCritic } from './prose-critic'
export { stakesCritic } from './stakes-critic'
export { CRITIC_RULES } from './critic-rules'
export { criticDisciplineScorer } from './critic-discipline-scorer'
export {
  CriticFindingSchema,
  CriticReportSchema,
  formatCriticReport,
  type CriticFinding,
  type CriticReport,
} from './critic-schema'
