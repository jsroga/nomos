/**
 * Cross-Domain AI Context Builder
 *
 * Builds rich context from game_entities table for AI agents.
 * Enables agents to be aware of entities from ALL domains.
 */

import { GameEntity } from '@/shared/data/queries/useGameEntities'
import {
  CROSS_DOMAIN_ENTITIES_API_PATH,
  CrossDomainContextLog,
  CrossDomainXmlTag,
  GameEntityTypeKey,
  XmlEscapeEntity,
} from '@/shared/agent-kernel/constants/cross-domain-context'
import { DEFAULT_DEV_PORT, URL_HTTP_PREFIX } from '@/shared/data/constants/url'
import { QueryParam, StringSeparator } from '@/shared/data/constants/protocol'

export async function buildCrossDomainContext(projectId: string): Promise<string> {
  if (!projectId) return ''

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${URL_HTTP_PREFIX}://localhost:${DEFAULT_DEV_PORT}`
    const response = await fetch(
      `${baseUrl}${CROSS_DOMAIN_ENTITIES_API_PATH}?${QueryParam.ProjectId}=${projectId}`
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

    const parts: string[] = [`<${CrossDomainXmlTag.Root}>`]
    parts.push(`  <${CrossDomainXmlTag.ProjectEntities} count="${entities.length}">`)

    if (byType[GameEntityTypeKey.Character]?.length > 0) {
      parts.push(
        `    <${CrossDomainXmlTag.Characters} count="${byType[GameEntityTypeKey.Character].length}">`
      )
      for (const char of byType[GameEntityTypeKey.Character]) {
        parts.push(
          `      <${CrossDomainXmlTag.Character} id="${char.id}" name="${escapeXml(char.name)}" source="${char.sourceDomain}">`
        )
        if (char.description) {
          parts.push(
            `        <${CrossDomainXmlTag.Description}>${escapeXml(char.description)}</${CrossDomainXmlTag.Description}>`
          )
        }
        if (char.metadata) {
          parts.push(
            `        <${CrossDomainXmlTag.Metadata}>${JSON.stringify(char.metadata, null, 2)}</${CrossDomainXmlTag.Metadata}>`
          )
        }
        parts.push(
          `        <${CrossDomainXmlTag.UsedIn}>${char.usedInDomains.join(StringSeparator.CommaSpace)}</${CrossDomainXmlTag.UsedIn}>`
        )
        parts.push(`      </${CrossDomainXmlTag.Character}>`)
      }
      parts.push(`    </${CrossDomainXmlTag.Characters}>`)
    }

    if (byType[GameEntityTypeKey.Location]?.length > 0) {
      parts.push(
        `    <${CrossDomainXmlTag.Locations} count="${byType[GameEntityTypeKey.Location].length}">`
      )
      for (const loc of byType[GameEntityTypeKey.Location]) {
        parts.push(
          `      <${CrossDomainXmlTag.Location} id="${loc.id}" name="${escapeXml(loc.name)}" source="${loc.sourceDomain}">`
        )
        if (loc.description) {
          parts.push(
            `        <${CrossDomainXmlTag.Description}>${escapeXml(loc.description)}</${CrossDomainXmlTag.Description}>`
          )
        }
        parts.push(
          `        <${CrossDomainXmlTag.UsedIn}>${loc.usedInDomains.join(StringSeparator.CommaSpace)}</${CrossDomainXmlTag.UsedIn}>`
        )
        parts.push(`      </${CrossDomainXmlTag.Location}>`)
      }
      parts.push(`    </${CrossDomainXmlTag.Locations}>`)
    }

    if (byType[GameEntityTypeKey.Mechanic]?.length > 0) {
      parts.push(
        `    <${CrossDomainXmlTag.Mechanics} count="${byType[GameEntityTypeKey.Mechanic].length}">`
      )
      for (const mech of byType[GameEntityTypeKey.Mechanic]) {
        parts.push(
          `      <${CrossDomainXmlTag.Mechanic} id="${mech.id}" name="${escapeXml(mech.name)}" source="${mech.sourceDomain}">`
        )
        if (mech.description) {
          parts.push(
            `        <${CrossDomainXmlTag.Description}>${escapeXml(mech.description)}</${CrossDomainXmlTag.Description}>`
          )
        }
        if (mech.metadata) {
          parts.push(
            `        <${CrossDomainXmlTag.Metadata}>${JSON.stringify(mech.metadata, null, 2)}</${CrossDomainXmlTag.Metadata}>`
          )
        }
        parts.push(
          `        <${CrossDomainXmlTag.UsedIn}>${mech.usedInDomains.join(StringSeparator.CommaSpace)}</${CrossDomainXmlTag.UsedIn}>`
        )
        parts.push(`      </${CrossDomainXmlTag.Mechanic}>`)
      }
      parts.push(`    </${CrossDomainXmlTag.Mechanics}>`)
    }

    if (byType[GameEntityTypeKey.Faction]?.length > 0) {
      parts.push(
        `    <${CrossDomainXmlTag.Factions} count="${byType[GameEntityTypeKey.Faction].length}">`
      )
      for (const faction of byType[GameEntityTypeKey.Faction]) {
        parts.push(
          `      <${CrossDomainXmlTag.Faction} id="${faction.id}" name="${escapeXml(faction.name)}" source="${faction.sourceDomain}">`
        )
        if (faction.description) {
          parts.push(
            `        <${CrossDomainXmlTag.Description}>${escapeXml(faction.description)}</${CrossDomainXmlTag.Description}>`
          )
        }
        parts.push(`      </${CrossDomainXmlTag.Faction}>`)
      }
      parts.push(`    </${CrossDomainXmlTag.Factions}>`)
    }

    if (byType[GameEntityTypeKey.Item]?.length > 0) {
      parts.push(`    <${CrossDomainXmlTag.Items} count="${byType[GameEntityTypeKey.Item].length}">`)
      for (const item of byType[GameEntityTypeKey.Item]) {
        parts.push(
          `      <${CrossDomainXmlTag.Item} id="${item.id}" name="${escapeXml(item.name)}" source="${item.sourceDomain}" />`
        )
      }
      parts.push(`    </${CrossDomainXmlTag.Items}>`)
    }

    if (byType[GameEntityTypeKey.Quest]?.length > 0) {
      parts.push(
        `    <${CrossDomainXmlTag.Quests} count="${byType[GameEntityTypeKey.Quest].length}">`
      )
      for (const quest of byType[GameEntityTypeKey.Quest]) {
        parts.push(
          `      <${CrossDomainXmlTag.Quest} id="${quest.id}" name="${escapeXml(quest.name)}" source="${quest.sourceDomain}">`
        )
        if (quest.description) {
          parts.push(
            `        <${CrossDomainXmlTag.Description}>${escapeXml(quest.description)}</${CrossDomainXmlTag.Description}>`
          )
        }
        parts.push(`      </${CrossDomainXmlTag.Quest}>`)
      }
      parts.push(`    </${CrossDomainXmlTag.Quests}>`)
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
