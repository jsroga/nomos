/** Judge scorer ids that Studio may persist as FilesystemStore overlays. */

export enum StoredJudgeScorerId {
  Magic = 'magic',
  Hallucination = 'hallucination',
  PersonaFidelity = 'persona-fidelity',
}

export const STORED_JUDGE_SCORER_IDS = [
  StoredJudgeScorerId.Magic,
  StoredJudgeScorerId.Hallucination,
  StoredJudgeScorerId.PersonaFidelity,
] as const
