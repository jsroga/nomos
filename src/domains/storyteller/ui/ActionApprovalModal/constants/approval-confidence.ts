export enum ApprovalConfidenceClass {
  High = 'text-green-400',
  Medium = 'text-yellow-400',
  Low = 'text-red-400',
}

export const getApprovalConfidenceClass = (confidence: number): ApprovalConfidenceClass => {
  if (confidence >= 0.8) return ApprovalConfidenceClass.High
  if (confidence >= 0.5) return ApprovalConfidenceClass.Medium
  return ApprovalConfidenceClass.Low
}
