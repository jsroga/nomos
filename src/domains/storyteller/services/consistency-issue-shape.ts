import {
  ConsistencyIssueType,
  ConsistencySeverity,
} from '@/domains/storyteller/services/constants/consistency-issues'

export interface ContinuityIssue {
  type: ConsistencyIssueType
  severity: ConsistencySeverity
  description: string
  location: string
  affectedElements: string[]
  suggestion?: string
}
