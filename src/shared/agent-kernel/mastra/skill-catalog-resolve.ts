import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  SkillCatalogId,
  SkillCatalogLevel,
  SkillCatalogStage,
  SkillManuscriptFormat,
} from '@/shared/agent-kernel/mastra/skill-catalog-ids'
import {
  SkillCatalogFs,
  SKILL_CATALOG,
  type SkillCatalogRow,
} from '@/shared/agent-kernel/mastra/skill-catalog-registry'
import { fileAgentsRootDir } from '@/shared/agent-kernel/mastra/load-agent-instructions'
import { FileEncoding } from '@/shared/data/constants/protocol'

export interface SkillResolveInput {
  readonly stage: SkillCatalogStage
  readonly problemTypes?: readonly string[]
  readonly catalog?: readonly SkillCatalogRow[]
  readonly manuscriptFormat?: SkillManuscriptFormat
}

export interface ResolvedSkill {
  readonly id: SkillCatalogId
  readonly level: SkillCatalogLevel
  readonly body?: string
}

function isManuscriptFormatId(id: SkillCatalogId): boolean {
  return id === SkillCatalogId.ManuscriptScript || id === SkillCatalogId.ManuscriptNovel
}

function rowMatches(row: SkillCatalogRow, input: SkillResolveInput): boolean {
  if (isManuscriptFormatId(row.id)) {
    if (input.stage !== SkillCatalogStage.Draft) return false
    if (row.id === SkillCatalogId.ManuscriptScript) {
      return input.manuscriptFormat === SkillManuscriptFormat.Script
    }
    return input.manuscriptFormat === SkillManuscriptFormat.Novel
  }
  if (!row.match.stages.includes(input.stage)) return false
  const problems = input.problemTypes ?? []
  if (row.match.problemTypes.length === 0) {
    return true
  }
  return row.match.problemTypes.some(problem => problems.includes(problem))
}

/** Optional L2 body path under mastra agents — missing file yields L2-without-body. */
function tryLoadBody(id: SkillCatalogId): string | undefined {
  const catalogPath = join(
    fileAgentsRootDir(),
    SkillCatalogFs.RootDir,
    id,
    SkillCatalogFs.SkillFile
  )
  const authorSkillPath = join(
    fileAgentsRootDir(),
    SkillCatalogFs.GrrmAuthorDir,
    SkillCatalogFs.SkillsDir,
    id,
    SkillCatalogFs.SkillFile
  )
  for (const path of [catalogPath, authorSkillPath]) {
    try {
      return readFileSync(path, FileEncoding.Utf8)
    } catch {
      continue
    }
  }
  return undefined
}

/**
 * Resolve catalog skills for a stage + problem types.
 * Every catalog id appears at L1; L2 body only on match (when a SKILL.md exists).
 */
export function resolveSkillCatalog(input: SkillResolveInput): ResolvedSkill[] {
  const catalog = input.catalog ?? SKILL_CATALOG
  const resolved: ResolvedSkill[] = []

  for (const row of catalog) {
    const matched = rowMatches(row, input)
    if (matched) {
      const body = tryLoadBody(row.id)
      resolved.push(
        body
          ? { id: row.id, level: SkillCatalogLevel.L2, body }
          : { id: row.id, level: SkillCatalogLevel.L2 }
      )
      continue
    }
    resolved.push({ id: row.id, level: SkillCatalogLevel.L1 })
  }

  return resolved
}

/** Skills that matched to L2 for this resolve (bodies present or match without body file). */
export function resolveMatchedSkillIds(input: SkillResolveInput): SkillCatalogId[] {
  const catalog = input.catalog ?? SKILL_CATALOG
  return catalog.filter(row => rowMatches(row, input)).map(row => row.id)
}
