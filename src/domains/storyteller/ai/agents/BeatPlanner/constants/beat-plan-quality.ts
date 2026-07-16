export enum BeatPlanGatedField {
  Goal = 'goal',
  Conflict = 'conflict',
  Turn = 'turn',
}

export const BEAT_PLAN_GATED_FIELDS = [
  BeatPlanGatedField.Goal,
  BeatPlanGatedField.Conflict,
  BeatPlanGatedField.Turn,
] as const

export const LIST_JOIN_SEPARATOR = ', '
