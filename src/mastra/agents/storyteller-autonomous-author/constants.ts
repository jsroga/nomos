import { FileEncoding } from '@/shared/data/constants/protocol'
import { FeatureFlag } from '@/shared/data/constants/feature-flags'

export enum AutonomousAuthorId {
  Agent = 'storyteller-autonomous-author',
}

export enum AutonomousAuthorName {
  Agent = 'Storyteller Autonomous Author',
}

export enum AutonomousAuthorDescription {
  Agent =
    'Long-running author: drafts an episode beat-by-beat toward a standing objective, judged by the critics after each iteration.',
}

/** Default goal budget — evaluations before the loop stops (resumable by raising it). */
export const STORYTELLER_AUTONOMOUS_MAX_RUNS = 20

export const STORYTELLER_AUTONOMOUS_ENV = FeatureFlag.StorytellerAutonomous

export const GOAL_JUDGE_SKILL_PATH = 'goal-judge/SKILL.md' as const

export const GOAL_JUDGE_FILE_ENCODING = FileEncoding.Utf8

export const AUTONOMOUS_INSTRUCTION_BLOCK_SEPARATOR = '\n\n'

export enum AutonomousAuthorSkillDir {
  Skills = 'skills',
}
