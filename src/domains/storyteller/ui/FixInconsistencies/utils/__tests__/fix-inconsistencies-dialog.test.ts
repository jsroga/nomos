import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  ConsistencyFixRunPhase,
  scanningCopyForStep,
  FixInconsistenciesDialogCopy,
  nextCompletedScanSteps,
} from '../fix-inconsistencies-dialog'
import { FixInconsistenciesStepId } from '@/domains/storyteller/ai/workflows/constants/fix-inconsistencies-workflow'

describe('scanningCopyForStep', () => {
  it('maps known scan steps to progress copy', () => {
    expect(scanningCopyForStep(FixInconsistenciesStepId.AssembleCanon)).toBe(
      FixInconsistenciesDialogCopy.AssembleCanon
    )
    expect(scanningCopyForStep(FixInconsistenciesStepId.AgenticScan)).toBe(
      FixInconsistenciesDialogCopy.AgenticScan
    )
    expect(scanningCopyForStep(null)).toBe(FixInconsistenciesDialogCopy.Scanning)
  })

  it('keeps applying as a distinct phase', () => {
    expect(ConsistencyFixRunPhase.Applying).not.toBe(ConsistencyFixRunPhase.Scanning)
  })
})

describe('nextCompletedScanSteps', () => {
  it('promotes the previous step into completed and ignores duplicate step ids', () => {
    const first = nextCompletedScanSteps([], null, FixInconsistenciesStepId.AssembleCanon)
    expect(first).toEqual({
      completedStepIds: [],
      stepId: FixInconsistenciesStepId.AssembleCanon,
    })
    const second = nextCompletedScanSteps(
      first?.completedStepIds ?? [],
      first?.stepId ?? null,
      FixInconsistenciesStepId.StructuralScan,
    )
    expect(second?.completedStepIds).toEqual([FixInconsistenciesStepId.AssembleCanon])
    expect(second?.stepId).toBe(FixInconsistenciesStepId.StructuralScan)
    expect(
      nextCompletedScanSteps(
        second?.completedStepIds ?? [],
        second?.stepId ?? null,
        FixInconsistenciesStepId.StructuralScan,
      ),
    ).toBeNull()
    expect(
      nextCompletedScanSteps(
        second?.completedStepIds ?? [],
        second?.stepId ?? null,
        FixInconsistenciesStepId.AssembleCanon,
      ),
    ).toBeNull()
  })
})

describe('FixInconsistenciesDialog source', () => {
  it('keeps the title and checklist in the body rather than description-only progress', () => {
    const src = readFileSync(
      'src/domains/storyteller/ui/FixInconsistencies/FixInconsistenciesDialog.tsx',
      'utf8',
    )
    expect(src).toContain('FixInconsistenciesDialogCopy.Title')
    expect(src).toContain('completedStepIds')
    expect(src).toContain('applyingRef')
  })
})
