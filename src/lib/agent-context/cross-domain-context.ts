/**
 * Cross-Domain AI Context Builder
 *
 * Builds rich context from game_entities table for AI agents.
 * Enables agents to be aware of entities from ALL domains.
 */

import { GameEntity } from '@/shared/data/queries/useGameEntities'

/**
 * Build cross-domain context XML for AI agents
 */
export async function buildCrossDomainContext(projectId: string): Promise<string> {
  if (!projectId) return ''

  try {
    // Fetch all game entities for this project
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/entities?projectId=${projectId}`
    )

    if (!response.ok) {
      console.warn('[CrossDomainContext] Failed to fetch entities')
      return ''
    }

    const { entities } = await response.json()

    if (!entities || entities.length === 0) {
      return ''
    }

    // Group entities by type
    const byType: Record<string, GameEntity[]> = {}
    for (const entity of entities) {
      if (!byType[entity.entityType]) {
        byType[entity.entityType] = []
      }
      byType[entity.entityType].push(entity)
    }

    // Build XML context
    const parts: string[] = ['<cross_domain_context>']
    parts.push(`  <project_entities count="${entities.length}">`)

    // Characters
    if (byType.character?.length > 0) {
      parts.push(`    <characters count="${byType.character.length}">`)
      for (const char of byType.character) {
        parts.push(
          `      <character id="${char.id}" name="${escapeXml(char.name)}" source="${char.sourceDomain}">`
        )
        if (char.description) {
          parts.push(`        <description>${escapeXml(char.description)}</description>`)
        }
        if (char.metadata) {
          parts.push(`        <metadata>${JSON.stringify(char.metadata, null, 2)}</metadata>`)
        }
        parts.push(`        <used_in>${char.usedInDomains.join(', ')}</used_in>`)
        parts.push('      </character>')
      }
      parts.push('    </characters>')
    }

    // Locations
    if (byType.location?.length > 0) {
      parts.push(`    <locations count="${byType.location.length}">`)
      for (const loc of byType.location) {
        parts.push(
          `      <location id="${loc.id}" name="${escapeXml(loc.name)}" source="${loc.sourceDomain}">`
        )
        if (loc.description) {
          parts.push(`        <description>${escapeXml(loc.description)}</description>`)
        }
        parts.push(`        <used_in>${loc.usedInDomains.join(', ')}</used_in>`)
        parts.push('      </location>')
      }
      parts.push('    </locations>')
    }

    // Mechanics
    if (byType.mechanic?.length > 0) {
      parts.push(`    <mechanics count="${byType.mechanic.length}">`)
      for (const mech of byType.mechanic) {
        parts.push(
          `      <mechanic id="${mech.id}" name="${escapeXml(mech.name)}" source="${mech.sourceDomain}">`
        )
        if (mech.description) {
          parts.push(`        <description>${escapeXml(mech.description)}</description>`)
        }
        if (mech.metadata) {
          parts.push(`        <metadata>${JSON.stringify(mech.metadata, null, 2)}</metadata>`)
        }
        parts.push(`        <used_in>${mech.usedInDomains.join(', ')}</used_in>`)
        parts.push('      </mechanic>')
      }
      parts.push('    </mechanics>')
    }

    // Factions
    if (byType.faction?.length > 0) {
      parts.push(`    <factions count="${byType.faction.length}">`)
      for (const faction of byType.faction) {
        parts.push(
          `      <faction id="${faction.id}" name="${escapeXml(faction.name)}" source="${faction.sourceDomain}">`
        )
        if (faction.description) {
          parts.push(`        <description>${escapeXml(faction.description)}</description>`)
        }
        parts.push('      </faction>')
      }
      parts.push('    </factions>')
    }

    // Items
    if (byType.item?.length > 0) {
      parts.push(`    <items count="${byType.item.length}">`)
      for (const item of byType.item) {
        parts.push(
          `      <item id="${item.id}" name="${escapeXml(item.name)}" source="${item.sourceDomain}" />`
        )
      }
      parts.push('    </items>')
    }

    // Quests
    if (byType.quest?.length > 0) {
      parts.push(`    <quests count="${byType.quest.length}">`)
      for (const quest of byType.quest) {
        parts.push(
          `      <quest id="${quest.id}" name="${escapeXml(quest.name)}" source="${quest.sourceDomain}">`
        )
        if (quest.description) {
          parts.push(`        <description>${escapeXml(quest.description)}</description>`)
        }
        parts.push('      </quest>')
      }
      parts.push('    </quests>')
    }

    parts.push('  </project_entities>')
    parts.push('</cross_domain_context>')

    return parts.join('\n')
  } catch (error) {
    console.error('[CrossDomainContext] Error building context:', error)
    return ''
  }
}

/**
 * Escape special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
