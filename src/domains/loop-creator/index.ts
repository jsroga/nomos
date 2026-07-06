/**
 * Loop Creator public module API.
 */

export { LoopCreatorLayout } from './ui/LoopCreatorLayout'
export { streamLoopCreator } from './core/graph/loop-graph'
export type { StreamEvent } from './core/graph/loop-graph'
export {
  createInitialLoopState,
  type LoopCreatorState,
  type LoopAgentAction,
  type MechanicNode,
  type MechanicEdge,
  type GameLoop,
} from './core/graph/state'
export { useAutoSave } from './state/useAutoSave'
export {
  runMarketAnalysis,
  streamMarketAnalysis,
  type MarketAnalysisReport,
  type LoopAnalysisInput,
} from './agents/market-analyst'
