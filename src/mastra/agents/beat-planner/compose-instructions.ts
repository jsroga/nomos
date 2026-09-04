import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  fileAgentsRootDir,
  loadAgentInstructions,
  stripMarkdownFrontmatter,
} from '@/shared/agent-kernel/mastra/load-agent-instructions'
import {
  BeatPlannerAgentId,
  GrrmAuthorAgentId,
} from '@/domains/storyteller/server'
import { FileEncoding } from '@/shared/data/constants/protocol'
import {
  GRRM_AUTHOR_SKILLS_DIRNAME,
  GrrmAuthorSkillPath,
} from '../grrm-author/constants'

const EPISODE_CONTEXT_HEADER = '\n\n## Episode Context\n'
const BLOCK_SEP = '\n\n'

function readGrrmPsychologySkill(): string {
  return stripMarkdownFrontmatter(
    readFileSync(
      join(
        fileAgentsRootDir(),
        GrrmAuthorAgentId.GrrmAuthor,
        GRRM_AUTHOR_SKILLS_DIRNAME,
        GrrmAuthorSkillPath.Psychology
      ),
      FileEncoding.Utf8
    )
  )
}

export function composeBeatPlannerInstructions(episodeContext?: string): string {
  const parts = [
    loadAgentInstructions(BeatPlannerAgentId.BeatPlanner),
    readGrrmPsychologySkill(),
  ]
  if (episodeContext?.trim()) {
    parts.push(`${EPISODE_CONTEXT_HEADER.trim()}\n${episodeContext.trim()}`)
  }
  return parts.join(BLOCK_SEP)
}
