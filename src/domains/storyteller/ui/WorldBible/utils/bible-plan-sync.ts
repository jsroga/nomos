export enum BiblePlanSyncDecision {
  Wait = 'wait',
  Apply = 'apply',
}

export function shouldSyncLocalPlanFromParent(input: {
  isEditing: boolean
  parentPlanJson: string
  lastSavedPlanJson: string | null
  lastAppliedParentJson: string | null
}): BiblePlanSyncDecision {
  if (input.isEditing) return BiblePlanSyncDecision.Wait
  if (!input.lastSavedPlanJson) return BiblePlanSyncDecision.Apply
  if (input.lastSavedPlanJson === input.parentPlanJson) return BiblePlanSyncDecision.Apply
  if (
    input.lastAppliedParentJson !== null &&
    input.parentPlanJson !== input.lastAppliedParentJson
  ) {
    return BiblePlanSyncDecision.Apply
  }
  return BiblePlanSyncDecision.Wait
}
