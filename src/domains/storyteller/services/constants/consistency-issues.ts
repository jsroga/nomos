export enum ConsistencyIssueType {
  Contradiction = 'contradiction',
  OrphanedSetup = 'orphaned_setup',
  MissingPayoff = 'missing_payoff',
}

export enum ConsistencySeverity {
  Critical = 'critical',
  Major = 'major',
  Minor = 'minor',
}

export enum ConsistencyUnknownLocation {
  Unknown = 'unknown',
}

export enum ConsistencySuggestion {
  ReviseBeatWorldRules = 'Revise beat to comply with world rules',
  CreateSetupEarlier = 'Create the setup in an earlier beat',
  AddPayoffBeat = 'Add a beat that pays off this setup',
}

export enum ConsistencyServiceError {
  UnknownCheckError = 'Unknown consistency check error',
}

export const CONSISTENCY_SEVERITY_ORDER: Record<ConsistencySeverity, number> = {
  [ConsistencySeverity.Critical]: 0,
  [ConsistencySeverity.Major]: 1,
  [ConsistencySeverity.Minor]: 2,
}
