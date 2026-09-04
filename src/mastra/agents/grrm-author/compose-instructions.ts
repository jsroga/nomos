import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  fileAgentsRootDir,
  loadAgentInstructions,
  stripMarkdownFrontmatter,
} from '@/shared/agent-kernel/mastra/load-agent-instructions'
import { formatBannedPhrasesForPrompt } from '@/domains/storyteller/ai/prompts/guardrails/anti-slop-phrases'
import { GrrmAuthorAgentId } from '@/domains/storyteller/ai/constants/agent-identity'
import { FileEncoding } from '@/shared/data/constants/protocol'
import {
  GRRM_AUTHOR_SKILLS_DIRNAME,
  GRRM_INSTRUCTION_BLOCK_SEPARATOR,
  GrrmAuthorSkillPath,
  GrrmInstructionSectionHeader,
} from './constants'
import { formatSkillCatalogL1 } from '@/shared/agent-kernel/mastra/skill-catalog-l1'
import { resolveSkillCatalog } from '@/shared/agent-kernel/mastra/skill-catalog-resolve'
import {
  SkillCatalogLevel,
  SkillCatalogStage,
} from '@/shared/agent-kernel/mastra/skill-catalog-ids'
import { emitRunTrace, RunTraceEventType } from '@/shared/agent-kernel/run-trace'

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
  /** Include skill bodies / catalog L2 (default true for author drafts). */
  includeSkills?: boolean
  stage?: SkillCatalogStage
  problemTypes?: readonly string[]
}

/**
 * Compose GRRM author instructions from the FS package (md + skills) plus
 * runtime slices. Banned phrases stay code-generated so the list cannot drift.
 * Catalog L1 is always listed when skills are on; L2 bodies load only on match.
 */
export function composeGrrmInstructions(options: GrrmInstructionsOptions = {}): string {
  const {
    phase,
    projectContext,
    episodeContext,
    includeSkills = true,
    stage = SkillCatalogStage.Draft,
    problemTypes = [],
  } = options
  const parts = [loadAgentInstructions(GrrmAuthorAgentId.GrrmAuthor)]

  if (phase) parts.push(`${GrrmInstructionSectionHeader.CurrentPhase}${phase}`)
  if (projectContext) parts.push(`${GrrmInstructionSectionHeader.ProjectContext}${projectContext}`)
  if (episodeContext) parts.push(`${GrrmInstructionSectionHeader.EpisodeContext}${episodeContext}`)

  parts.push(formatBannedPhrasesForPrompt())

  if (includeSkills) {
    parts.push(formatSkillCatalogL1())
    const resolved = resolveSkillCatalog({ stage, problemTypes })
    for (const skill of resolved) {
      emitRunTrace({
        type: RunTraceEventType.SkillResolve,
        role: GrrmAuthorAgentId.GrrmAuthor,
        detail: `${skill.id}:${skill.level}`,
      })
      if (skill.level === SkillCatalogLevel.L2 && skill.body) {
        parts.push(skill.body)
      }
    }
    // Keep anti-slop until Humanizer wins on s8/s9; psychology lives on Planner (Slice F).
    parts.push(readSkill(GrrmAuthorSkillPath.AntiSlop))
  }

  return parts.join(GRRM_INSTRUCTION_BLOCK_SEPARATOR)
}

/** Compact always-on brief only (no skill bodies) — chat / fast paths. */
export function composeGrrmInstructionsCompact(): string {
  return composeGrrmInstructions({ includeSkills: false })
}
