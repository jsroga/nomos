export enum GrrmAuthorSkillDir {
  Skills = 'skills',
}

export enum GrrmAuthorSkillPath {
  AntiSlop = 'anti-slop/SKILL.md',
  Psychology = 'psychology/SKILL.md',
}

export const GRRM_AUTHOR_SKILLS_DIRNAME = GrrmAuthorSkillDir.Skills

export const GRRM_INSTRUCTION_BLOCK_SEPARATOR = '\n\n'

export enum GrrmInstructionSectionHeader {
  CurrentPhase = '## Current Phase\n',
  ProjectContext = '## Project Context\n',
  EpisodeContext = '## Episode Context\n',
}
