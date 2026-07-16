/**
 * Cross-Domain AI Context Builder
 *
 * Builds rich context from game_entities table for AI agents.
 * Enables agents to be aware of entities from ALL domains.
 */

import { GameEntity } from '@/shared/data/queries/useGameEntities'
import { buildUrl } from '@/shared/data/url-builder'
import {
  CROSS_DOMAIN_ENTITIES_API_PATH,
  CrossDomainContextLog,
  CrossDomainXmlTag,
  GameEntityTypeKey,
  XmlEscapeEntity,
} from '@/shared/agent-kernel/constants/cross-domain-context'
import { DEFAULT_DEV_PORT, URL_HTTP_PREFIX } from '@/shared/data/constants/url'
import { QueryParam, StringSeparator } from '@/shared/data/constants/protocol'

interface EntitySectionConfig {
  sectionTag: string
  itemTag: string
  includeMetadata?: boolean
  includeUsedIn?: boolean
  selfClosing?: boolean
}

// Per-type serialization rules — collapses six near-identical XML blocks.
const ENTITY_SECTIONS: Array<{ type: string; config: EntitySectionConfig }> = [
  {
    type: GameEntityTypeKey.Character,
    config: {
      sectionTag: CrossDomainXmlTag.Characters,
      itemTag: CrossDomainXmlTag.Character,
      includeMetadata: true,
      includeUsedIn: true,
    },
  },
  {
    type: GameEntityTypeKey.Location,
    config: {
      sectionTag: CrossDomainXmlTag.Locations,
      itemTag: CrossDomainXmlTag.Location,
      includeUsedIn: true,
    },
  },
  {
    type: GameEntityTypeKey.Mechanic,
    config: {
      sectionTag: CrossDomainXmlTag.Mechanics,
      itemTag: CrossDomainXmlTag.Mechanic,
      includeMetadata: true,
      includeUsedIn: true,
    },
  },
  {
    type: GameEntityTypeKey.Faction,
    config: { sectionTag: CrossDomainXmlTag.Factions, itemTag: CrossDomainXmlTag.Faction },
  },
  {
    type: GameEntityTypeKey.Item,
    config: {
      sectionTag: CrossDomainXmlTag.Items,
      itemTag: CrossDomainXmlTag.Item,
      selfClosing: true,
    },
  },
  {
    type: GameEntityTypeKey.Quest,
    config: { sectionTag: CrossDomainXmlTag.Quests, itemTag: CrossDomainXmlTag.Quest },
  },
]

/** Serialize one entity type's list to XML lines (empty list → no lines). */
function buildEntitySection(entities: GameEntity[], config: EntitySectionConfig): string[] {
  if (!entities || entities.length === 0) return []
  const lines: string[] = [`    <${config.sectionTag} count="${entities.length}">`]
  for (const entity of entities) {
    const open = `      <${config.itemTag} id="${entity.id}" name="${escapeXml(entity.name)}" source="${entity.sourceDomain}"`
    if (config.selfClosing) {
      lines.push(`${open} />`)
      continue
    }
    lines.push(`${open}>`)
    if (entity.description) {
      lines.push(
        `        <${CrossDomainXmlTag.Description}>${escapeXml(entity.description)}</${CrossDomainXmlTag.Description}>`
      )
    }
    if (config.includeMetadata && entity.metadata) {
      lines.push(
        `        <${CrossDomainXmlTag.Metadata}>${JSON.stringify(entity.metadata, null, 2)}</${CrossDomainXmlTag.Metadata}>`
      )
    }
    if (config.includeUsedIn) {
      lines.push(
        `        <${CrossDomainXmlTag.UsedIn}>${entity.usedInDomains.join(StringSeparator.CommaSpace)}</${CrossDomainXmlTag.UsedIn}>`
      )
    }
    lines.push(`      </${config.itemTag}>`)
  }
  lines.push(`    </${config.sectionTag}>`)
  return lines
}

export async function buildCrossDomainContext(projectId: string): Promise<string> {
  if (!projectId) return ''

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${URL_HTTP_PREFIX}://localhost:${DEFAULT_DEV_PORT}`
    const response = await fetch(
      buildUrl(`${baseUrl}${CROSS_DOMAIN_ENTITIES_API_PATH}`, { [QueryParam.ProjectId]: projectId })
    )

    if (!response.ok) {
      console.warn(CrossDomainContextLog.FetchFailed)
      return ''
    }

    const { entities } = await response.json()

    if (!entities || entities.length === 0) {
      return ''
    }

    const byType: Record<string, GameEntity[]> = {}
    for (const entity of entities) {
      if (!byType[entity.entityType]) {
        byType[entity.entityType] = []
      }
      byType[entity.entityType].push(entity)
    }

    const parts: string[] = [
      `<${CrossDomainXmlTag.Root}>`,
      `  <${CrossDomainXmlTag.ProjectEntities} count="${entities.length}">`,
    ]

    for (const { type, config } of ENTITY_SECTIONS) {
      parts.push(...buildEntitySection(byType[type] ?? [], config))
    }

    parts.push(`  </${CrossDomainXmlTag.ProjectEntities}>`)
    parts.push(`</${CrossDomainXmlTag.Root}>`)

    return parts.join('\n')
  } catch (error) {
    console.error(CrossDomainContextLog.BuildError, error)
    return ''
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, XmlEscapeEntity.Amp)
    .replace(/</g, XmlEscapeEntity.Lt)
    .replace(/>/g, XmlEscapeEntity.Gt)
    .replace(/"/g, XmlEscapeEntity.Quot)
    .replace(/'/g, XmlEscapeEntity.Apos)
}
