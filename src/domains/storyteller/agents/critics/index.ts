/**
 * The three narrow critics (StoryForge topology): continuity, prose, stakes.
 * Diagnose only — quoted evidence, never replacement prose.
 */

export { continuityCritic } from './ContinuityCritic'
export { proseCritic } from './ProseCritic'
export { stakesCritic } from './StakesCritic'
export { CRITIC_RULES } from './critic-rules'
export { criticDisciplineScorer } from './critic-discipline-scorer'
export {
  CriticFindingSchema,
  CriticReportSchema,
  formatCriticReport,
  type CriticFinding,
  type CriticReport,
} from './critic-schema'
