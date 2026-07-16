/**
 * Entity Auto-Linker Service
 *
 * Post-processes AI-generated text to automatically convert plain entity mentions
 * into entity references [Name][id] when the entity exists in the project.
 *
 * Example:
 * Input:  "The Mood Wardens control the city"
 * Output: "[The Mood Wardens][faction-the-mood-wardens] control the city"
 */

import { namedRecordsFromJson, readString, recordArrayFromJson, recordFromJson } from '@/shared/data/json-guards'
import {
  AutoLinkerEntityType,
  EntityAutoLinkerArticlePrefix,
  EntityAutoLinkerLog,
  EntityAutoLinkerRegexFlag,
  EntityAutoLinkerRegexReplacement,
  EntityAutoLinkerStopWord,
} from '@/domains/storyteller/services/constants/entity-auto-linker'

interface EntityMatch {
  name: string
  id: string
  type: string
  startIndex: number
  endIndex: number
}

/**
 * Auto-link entity names in text to entity references
 *
 * @param text - Generated text that may contain plain entity names
 * @param projectId - Project ID to fetch entities from
 * @returns Text with entity names converted to references
 */
export async function autoLinkEntities(text: string, projectId: string): Promise<string> {
  if (!text || !projectId) return text

  try {
    // Fetch all known entities from the project
    const { db } = await import('@/db/client')
    const { projects, storyPlans, characters } = await import('@/db')
    const { eq } = await import('drizzle-orm')

    // Fetch project basics first (lighter query)
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    })

    if (!project) return text

    // Fetch story plan content separately if needed (avoids heavy join)
    let storyPlan = recordFromJson(project.storyPlan)

    // If no legacy storyPlan, check the table
    if (Object.keys(storyPlan).length === 0) {
      const sp = await db.query.storyPlans.findFirst({
        where: eq(storyPlans.projectId, projectId),
      })
      if (sp?.content) {
        storyPlan = recordFromJson(sp.content)
      }
    }

    const seriesBible = recordFromJson(project.seriesBible)

    // Fetch characters from the characters table
    const projectCharacters = await db.query.characters.findMany({
      where: eq(characters.projectId, projectId),
    })

    const cast = projectCharacters || []

    // Build entity lookup map: name -> {id, type}
    const entityMap = new Map<string, { id: string; type: string }>()

    // Add factions
    const factions = namedRecordsFromJson(storyPlan.factions)
    for (const faction of factions) {
      const name = faction.name
      const factionId = `faction-${readString(faction.id)?.slice(0, 8) || name.toLowerCase().replace(/\s+/g, '-')}`
      entityMap.set(name.toLowerCase(), { id: factionId, type: AutoLinkerEntityType.Faction })

      if (name.startsWith(EntityAutoLinkerArticlePrefix.The)) {
        const withoutThe = name.slice(EntityAutoLinkerArticlePrefix.The.length)
        entityMap.set(withoutThe.toLowerCase(), { id: factionId, type: AutoLinkerEntityType.Faction })
      }
    }

    const keyCharacters = recordArrayFromJson(storyPlan.keyCharacters)
    const allCharacters = [...cast, ...keyCharacters]

    for (const rawChar of allCharacters) {
      const char = recordFromJson(rawChar)
      const charName = readString(char.name)
      if (charName) {
        const charId = `char-${readString(char.id)?.slice(0, 8) || charName.toLowerCase().replace(/\s+/g, '-')}`
        entityMap.set(charName.toLowerCase(), { id: charId, type: AutoLinkerEntityType.Character })

        const firstName = charName.split(' ')[0]
        if (firstName && firstName.length > 2 && !entityMap.has(firstName.toLowerCase())) {
          entityMap.set(firstName.toLowerCase(), { id: charId, type: AutoLinkerEntityType.Character })
        }

        if (charName.startsWith(EntityAutoLinkerArticlePrefix.The)) {
          const withoutThe = charName.slice(EntityAutoLinkerArticlePrefix.The.length)
          if (withoutThe.length > 2 && !entityMap.has(withoutThe.toLowerCase())) {
            entityMap.set(withoutThe.toLowerCase(), { id: charId, type: AutoLinkerEntityType.Character })
          }
        }
      }
    }

    const worldRules = recordArrayFromJson(storyPlan.worldRules)
    for (const rawRule of worldRules) {
      const rule = recordFromJson(rawRule)
      const ruleText = readString(rule.rule)
      if (ruleText) {
        const ruleId = `rule-${readString(rule.id)?.slice(0, 8) || ruleText.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`
        const ruleKey = ruleText.split(' ').slice(0, 5).join(' ').toLowerCase()
        entityMap.set(ruleKey, { id: ruleId, type: AutoLinkerEntityType.Rule })
      }
    }

    const items = recordArrayFromJson(storyPlan.items)
    for (const rawItem of items) {
      const item = recordFromJson(rawItem)
      const itemName = readString(item.name)
      if (itemName) {
        const itemId = `item-${readString(item.id)?.slice(0, 8) || itemName.toLowerCase().replace(/\s+/g, '-')}`
        entityMap.set(itemName.toLowerCase(), { id: itemId, type: AutoLinkerEntityType.Item })

        if (itemName.startsWith(EntityAutoLinkerArticlePrefix.The)) {
          const withoutThe = itemName.slice(EntityAutoLinkerArticlePrefix.The.length)
          entityMap.set(withoutThe.toLowerCase(), { id: itemId, type: AutoLinkerEntityType.Item })
        }
      }
    }

    const events = recordArrayFromJson(storyPlan.events)
    for (const rawEvent of events) {
      const event = recordFromJson(rawEvent)
      const eventName = readString(event.name)
      if (eventName) {
        const eventId = `event-${readString(event.id)?.slice(0, 8) || eventName.toLowerCase().replace(/\s+/g, '-')}`
        entityMap.set(eventName.toLowerCase(), { id: eventId, type: AutoLinkerEntityType.Event })

        if (eventName.startsWith(EntityAutoLinkerArticlePrefix.The)) {
          const withoutThe = eventName.slice(EntityAutoLinkerArticlePrefix.The.length)
          entityMap.set(withoutThe.toLowerCase(), { id: eventId, type: AutoLinkerEntityType.Event })
        }
      }
    }

    const worldDesc =
      readString(storyPlan.worldDescription) ?? readString(seriesBible.worldDescription) ?? ''
    if (worldDesc) {
      // Match capitalized phrases that might be place names
      // Pattern: "The [Capitalized Word(s)]" or standalone "Capitalized Word(s)"
      const placePattern =
        /\b(The\s+)?([A-Z][a-z]+(?:\s+(?:of|the)\s+[A-Z][a-z]+|\s+[A-Z][a-z]+)*)\b/g
      let match
      const potentialPlaces = new Set<string>()

      while ((match = placePattern.exec(worldDesc)) !== null) {
        const placeName = match[0].trim()
        // Filter out common words and short phrases
        if (
          placeName.length > 5 &&
          ![
            EntityAutoLinkerArticlePrefix.TheCapital,
            EntityAutoLinkerStopWord.A,
            EntityAutoLinkerStopWord.An,
            EntityAutoLinkerStopWord.In,
            EntityAutoLinkerStopWord.On,
            EntityAutoLinkerStopWord.At,
          ].some(word => word === placeName)
        ) {
          potentialPlaces.add(placeName)
        }
      }

      // Add potential places to entity map (only if not already added)
      for (const placeName of Array.from(potentialPlaces).slice(0, 20)) {
        // Limit to 20 places
        const lowerName = placeName.toLowerCase()
        if (!entityMap.has(lowerName)) {
          const placeId = `place-${placeName.toLowerCase().replace(/\s+/g, '-')}`
          entityMap.set(lowerName, { id: placeId, type: AutoLinkerEntityType.Place })

          // Also add variant without "The"
          if (placeName.startsWith(EntityAutoLinkerArticlePrefix.The)) {
            const withoutThe = placeName.slice(EntityAutoLinkerArticlePrefix.The.length)
            if (!entityMap.has(withoutThe.toLowerCase())) {
              entityMap.set(withoutThe.toLowerCase(), { id: placeId, type: AutoLinkerEntityType.Place })
            }
          }
        }
      }
    }

    if (entityMap.size === 0) {
      // console.log('[AutoLinker] No entities found in project to link')
      return text // No entities to link
    }

    // console.log(`[AutoLinker] Found ${entityMap.size} entities to potentially link`)

    // Find ranges of existing entity references to avoid re-linking inside them
    const existingRefRanges: Array<{ start: number; end: number }> = []
    const existingRefPattern = /\[([^\]]+)\]\[([^\]\s]+)\]/g
    let existingMatch
    while ((existingMatch = existingRefPattern.exec(text)) !== null) {
      existingRefRanges.push({
        start: existingMatch.index,
        end: existingMatch.index + existingMatch[0].length,
      })
    }

    const isInsideExistingRef = (start: number, end: number) =>
      existingRefRanges.some(r => start >= r.start && end <= r.end)

    // Find all entity name matches in text
    const matches: EntityMatch[] = []

    // Sort entity names by length (longest first) to match "The Mood Wardens" before "Mood Wardens"
    const sortedNames = Array.from(entityMap.keys()).sort((a, b) => b.length - a.length)

    for (const entityName of sortedNames) {
      const entity = entityMap.get(entityName)
      if (!entity) continue

      // Create case-insensitive regex that matches whole words
      // Look for entity name NOT already in reference format
      const escapedName = entityName.replace(
        /[.*+?^${}()|[\]\\]/g,
        EntityAutoLinkerRegexReplacement.EscapedMatch
      )
      const pattern = new RegExp(
        `(?<!\\[)\\b(${escapedName})\\b(?!\\]\\[)`,
        EntityAutoLinkerRegexFlag.GlobalCaseInsensitive
      )

      let match
      while ((match = pattern.exec(text)) !== null) {
        // Skip matches that fall inside existing entity references
        if (isInsideExistingRef(match.index, match.index + match[1].length)) continue

        matches.push({
          name: match[1], // Use actual matched text (preserves casing)
          id: entity.id,
          type: entity.type,
          startIndex: match.index,
          endIndex: match.index + match[1].length,
        })
      }
    }

    // console.log(`[AutoLinker] Found ${matches.length} total matches before overlap removal`)

    if (matches.length === 0) {
      return text // No matches found
    }

    // Sort matches by start index (descending) so we can replace from end to start
    // This prevents index shifting issues
    matches.sort((a, b) => b.startIndex - a.startIndex)

    // Remove overlapping matches (keep the longest/first one)
    const nonOverlapping: EntityMatch[] = []
    for (const match of matches) {
      const overlaps = nonOverlapping.some(
        existing =>
          (match.startIndex >= existing.startIndex && match.startIndex < existing.endIndex) ||
          (match.endIndex > existing.startIndex && match.endIndex <= existing.endIndex)
      )
      if (!overlaps) {
        nonOverlapping.push(match)
      }
    }

    // Apply replacements from end to start
    let result = text
    for (const match of nonOverlapping) {
      const before = result.slice(0, match.startIndex)
      const after = result.slice(match.endIndex)
      const replacement = `[${match.name}][${match.id}]`
      result = before + replacement + after
    }

    const linkedCount = nonOverlapping.length
    if (linkedCount > 0) {
      console.log(`🔗 [AutoLinker] Linked ${linkedCount} entities in generated text`)
    }

    return result
  } catch (error) {
    console.warn(EntityAutoLinkerLog.FailedAutoLink, error)
    return text // Return original text on error
  }
}

export const entityAutoLinker = {
  autoLink: autoLinkEntities,
}
