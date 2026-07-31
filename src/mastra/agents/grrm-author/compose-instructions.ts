import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  fileAgentsRootDir,
  loadAgentInstructions,
  stripMarkdownFrontmatter,
} from '@/shared/agent-kernel/mastra/load-agent-instructions'
import { formatBannedPhrasesForPrompt } from '@/domains/storyteller/ai/prompts/guardrails/anti-slop-phrases'
import { FileEncoding } from '@/shared/data/constants/protocol'
import { GrrmAuthorAgentId } from '@/domains/storyteller/ai/constants/agent-identity'
import {
  GRRM_AUTHOR_SKILLS_DIRNAME,
  GRRM_INSTRUCTION_BLOCK_SEPARATOR,
  GrrmAuthorSkillPath,
  GrrmInstructionSectionHeader,
} from './constants'

const SKILLS_DIR = join(
  fileAgentsRootDir(),
  GrrmAuthorAgentId.GrrmAuthor,
  GRRM_AUTHOR_SKILLS_DIRNAME
)

function readSkill(relativePath: GrrmAuthorSkillPath): string {
  return stripMarkdownFrontmatter(
    readFileSync(join(SKILLS_DIR, relativePath), FileEncoding.Utf8)
  )
}

export interface GrrmInstructionsOptions {
  phase?: string
  projectContext?: string
  episodeContext?: string
  /** Include long skill bodies (default true for author drafts). */
  includeSkills?: boolean
}

/**
 * Compose GRRM author instructions from the FS package (md + skills) plus
 * runtime slices. Banned phrases stay code-generated so the list cannot drift.
 */
export function composeGrrmInstructions(options: GrrmInstructionsOptions = {}): string {
  const { phase, projectContext, episodeContext, includeSkills = true } = options
  const parts = [loadAgentInstructions(GrrmAuthorAgentId.GrrmAuthor)]

  if (phase) parts.push(`${GrrmInstructionSectionHeader.CurrentPhase}${phase}`)
  if (projectContext) parts.push(`${GrrmInstructionSectionHeader.ProjectContext}${projectContext}`)
  if (episodeContext) parts.push(`${GrrmInstructionSectionHeader.EpisodeContext}${episodeContext}`)

  parts.push(formatBannedPhrasesForPrompt())

  if (includeSkills) {
    parts.push(readSkill(GrrmAuthorSkillPath.AntiSlop))
    parts.push(readSkill(GrrmAuthorSkillPath.Psychology))
  }

  return parts.join(GRRM_INSTRUCTION_BLOCK_SEPARATOR)
}

/** Compact always-on brief only (no skill bodies) — chat / fast paths. */
export function composeGrrmInstructionsCompact(): string {
  return composeGrrmInstructions({ includeSkills: false })
}
