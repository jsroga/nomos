/**
 * Server-only loop-creator exports.
 * Use in API routes — never import from the client barrel.
 */

export { streamLoopCreator } from './core/graph/loop-graph'
export type { StreamEvent } from './core/graph/loop-graph'
export { LOOP_CREATOR_ROUTE_MAX_DURATION_SEC } from './constants/loop-orchestrator'
export {
  runMarketAnalysis,
  streamMarketAnalysis,
  type MarketAnalysisReport,
  type LoopAnalysisInput,
} from './ai/agents/market-analyst'
