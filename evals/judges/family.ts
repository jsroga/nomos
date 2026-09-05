export enum SameFamilyJudgeErrorMessage {
  Rejected = 'Judge family must not match author family',
}

export function modelFamily(modelId: string): string {
  const slash = modelId.indexOf('/')
  if (slash <= 0) return modelId.trim().toLowerCase()
  return modelId.slice(0, slash).trim().toLowerCase()
}

export function assertJudgeFamilyDiffers(judgeModelId: string, authorModelId: string): void {
  if (modelFamily(judgeModelId) === modelFamily(authorModelId)) {
    throw new Error(
      `${SameFamilyJudgeErrorMessage.Rejected}: ${modelFamily(judgeModelId)} (${judgeModelId} vs ${authorModelId})`
    )
  }
}
