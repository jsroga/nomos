import {
  SKILL_CATALOG,
  type SkillCatalogRow,
} from '@/shared/agent-kernel/mastra/skill-catalog-registry'

const L1_HEADER = '## Skill catalog (L1 — names only)'
const L1_LINE_PREFIX = '- '

/** Concatenate name + description only (no skill bodies). */
export function formatSkillCatalogL1(
  rows: readonly SkillCatalogRow[] = SKILL_CATALOG
): string {
  const lines = rows.map(
    row => `${L1_LINE_PREFIX}${row.id}: ${row.description}`
  )
  return [L1_HEADER, ...lines].join('\n')
}
