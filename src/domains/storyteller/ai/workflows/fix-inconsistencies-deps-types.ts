import '@/shared/data/server-guard'
import type {
  ConsistencyFixItem,
  ContinuityFinding,
} from './fix-inconsistencies-schema'
import type { AssembledCanon, SkippedFinding } from './fix-inconsistencies-contract'
import type { ContinuityIssue } from '@/domains/storyteller/services/consistency-service'

export type { AssembledCanon }

export interface StructuralScanResult {
  issues: ContinuityIssue[]
}

export interface ApplyFixesResult {
  appliedCount: number
  undoId?: string
  errors?: string[]
}

export interface FixInconsistenciesDeps {
  assembleCanon: (projectId: string) => Promise<AssembledCanon>
  structuralScan: (projectId: string) => Promise<StructuralScanResult>
  agenticScan: (canon: AssembledCanon) => Promise<ContinuityFinding[]>
  proposeFixes: (
    canon: AssembledCanon,
    findings: ContinuityFinding[]
  ) => Promise<ConsistencyFixItem[]>
  applyFixes: (
    projectId: string,
    fixes: ConsistencyFixItem[]
  ) => Promise<ApplyFixesResult>
  filterLocked: (
    canon: AssembledCanon,
    findings: ContinuityFinding[],
    fixes: ConsistencyFixItem[]
  ) => { fixes: ConsistencyFixItem[]; skipped: SkippedFinding[] }
}
