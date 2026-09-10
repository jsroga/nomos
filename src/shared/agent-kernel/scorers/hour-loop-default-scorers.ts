export enum HourLoopScorerId {
  Magic = 'magic',
  ProseCraft = 'prose-craft',
  StakesCost = 'stakes-cost',
  StoryMotion = 'story-motion',
  Consistency = 'consistency',
  Hallucination = 'hallucination',
}

/** Default hour-loop subset (Action 54). Not every STORYTELLER_SCORERS entry. */
export const HOUR_LOOP_DEFAULT_SCORERS = [
  HourLoopScorerId.Magic,
  HourLoopScorerId.ProseCraft,
  HourLoopScorerId.StakesCost,
  HourLoopScorerId.StoryMotion,
] as const

export function hourLoopScorersForItem(item?: {
  facts?: unknown
  canon?: unknown
}): string[] {
  const ids: string[] = [...HOUR_LOOP_DEFAULT_SCORERS]
  if (Array.isArray(item?.facts) && item.facts.length > 0) {
    ids.push(HourLoopScorerId.Consistency)
  }
  if (typeof item?.canon === 'string' && item.canon.length > 0) {
    ids.push(HourLoopScorerId.Hallucination)
  }
  return ids
}

export function hourLoopScorerIds(item?: { facts?: unknown; canon?: unknown }): string[] {
  return hourLoopScorersForItem(item)
}

/** Scorers attached to a live hour experiment. Per-item skip still applies when facts/canon are missing. */
export function hourLoopExperimentScorerIds(): string[] {
  return [
    HourLoopScorerId.Magic,
    HourLoopScorerId.ProseCraft,
    HourLoopScorerId.StakesCost,
    HourLoopScorerId.StoryMotion,
    HourLoopScorerId.Consistency,
    HourLoopScorerId.Hallucination,
  ]
}
