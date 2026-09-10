import { STORED_JUDGE_SCORER_IDS } from './constants/stored-judge-scorers'

export { STORED_JUDGE_SCORER_IDS }
export { StoredJudgeScorerId } from './constants/stored-judge-scorers'

/** Drop TypeScript twins when FilesystemStore already has that scorer id. */
export function omitStoredJudgeCodeScorers<T extends object>(
  scorers: T,
  storedIds: readonly string[],
): T {
  const stored = new Set(storedIds)
  const next = { ...scorers }
  for (const id of STORED_JUDGE_SCORER_IDS) {
    if (stored.has(id)) Reflect.deleteProperty(next, id)
  }
  return next
}
