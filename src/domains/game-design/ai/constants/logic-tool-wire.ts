import { ListSeparator } from './agent-copy'
import { GameDesignToolCopy } from './game-design-tool-wire'

export enum LogicToolId {
  IdentifyCoreLoop = 'identify_core_loop',
  AnalyzeMechanicBalance = 'analyze_mechanic_balance',
  SuggestProgression = 'suggest_progression',
  ValidateLoopStructure = 'validate_loop_structure',
}

export enum TargetAudience {
  Casual = 'casual',
  Midcore = 'midcore',
  Hardcore = 'hardcore',
}

export enum ExpansionDirection {
  Depth = 'depth',
  Breadth = 'breadth',
  Complexity = 'complexity',
}

export enum LogicToolCopy {
  UnknownGenre = 'unknown game genre',
  NoMechanicsForCoreLoop = 'You must provide at least one mechanic to identify a core loop. Please generate some mechanics first.',
  NoMechanicsToAnalyze = 'No mechanics provided to analyze.',
  UnknownLoopId = 'unknown',
  CurrentLoopRequired = 'currentLoop is required to suggest progression.',
  LoopMalformed = 'loop is missing or malformed. loop.nodes and loop.edges are required.',
  NoCycleDetected = 'No cycle detected in the loop - game loops should typically form a cycle',
}

export enum ValidateLoopIssueType {
  OrphanNode = 'orphan_node',
  MissingMechanic = 'missing_mechanic',
  CycleBreak = 'cycle_break',
  UnreachableState = 'unreachable_state',
  InvalidEdge = 'invalid_edge',
}

export enum ValidateLoopSeverity {
  Error = 'error',
  Warning = 'warning',
}

export const LOGIC_EXPANSION_HINTS: Record<ExpansionDirection, string> = {
  [ExpansionDirection.Depth]: '(Make existing systems more nuanced and layered)',
  [ExpansionDirection.Breadth]: '(Add new parallel systems and variety)',
  [ExpansionDirection.Complexity]: '(Increase interconnection and emergent gameplay)',
}

export function formatMechanicTransformerLine(
  type: string,
  inputs: unknown,
  outputs: unknown
): string {
  return `  - ${type}: inputs=${JSON.stringify(inputs)}, outputs=${JSON.stringify(outputs)}`
}

export function joinWithCommaSpace(items: string[]): string {
  return items.join(ListSeparator.CommaSpace)
}

export { GameDesignToolCopy, ListSeparator }
