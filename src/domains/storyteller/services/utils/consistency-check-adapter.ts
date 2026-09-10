export enum LegacyConsistencyType {
  PlotLogic = 'plot_logic',
  Timeline = 'timeline',
  Character = 'character',
}

export enum ContinuityIssueWireType {
  Contradiction = 'contradiction',
  Timeline = 'timeline',
  Character = 'character',
  MissingPayoff = 'missing_payoff',
  OrphanedSetup = 'orphaned_setup',
  KnowledgeViolation = 'knowledge_violation',
}

export enum AffectedElementKind {
  Beat = 'beat',
}

export enum ConsistencyCheckAdapterCopy {
  NoIssuesFound = 'No continuity issues found.',
}

export function legacyConsistencyTypeForIssue(
  issueType: ContinuityIssueWireType
): LegacyConsistencyType {
  switch (issueType) {
    case ContinuityIssueWireType.Timeline:
      return LegacyConsistencyType.Timeline
    case ContinuityIssueWireType.Character:
    case ContinuityIssueWireType.KnowledgeViolation:
      return LegacyConsistencyType.Character
    default:
      return LegacyConsistencyType.PlotLogic
  }
}

export function parseContinuityIssueWireType(value: string): ContinuityIssueWireType | undefined {
  switch (value) {
    case ContinuityIssueWireType.Contradiction:
      return ContinuityIssueWireType.Contradiction
    case ContinuityIssueWireType.Timeline:
      return ContinuityIssueWireType.Timeline
    case ContinuityIssueWireType.Character:
      return ContinuityIssueWireType.Character
    case ContinuityIssueWireType.MissingPayoff:
      return ContinuityIssueWireType.MissingPayoff
    case ContinuityIssueWireType.OrphanedSetup:
      return ContinuityIssueWireType.OrphanedSetup
    case ContinuityIssueWireType.KnowledgeViolation:
      return ContinuityIssueWireType.KnowledgeViolation
    default:
      return undefined
  }
}
