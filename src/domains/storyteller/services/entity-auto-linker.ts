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
    const { db } = await import('@/lib/db')
    const { projects, storyPlans, characters } = await import('@/domains/storyteller/db/schema')
    const { eq } = await import('drizzle-orm')

    // Fetch project basics first (lighter query)
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    })

    if (!project) return text

    // Fetch story plan content separately if needed (avoids heavy join)
    let storyPlan = (project.storyPlan as any) || {}

    // If no legacy storyPlan, check the table
    if (!project.storyPlan) {
      const sp = await db.query.storyPlans.findFirst({
        where: eq(storyPlans.projectId, projectId),
      })
      if (sp?.content) {
        storyPlan = sp.content
      }
    }

    const seriesBible = (project.seriesBible as any) || {}

    // Fetch characters from the characters table
    const projectCharacters = await db.query.characters.findMany({
      where: eq(characters.projectId, projectId),
    })

    const cast = projectCharacters || []

    // Build entity lookup map: name -> {id, type}
    const entityMap = new Map<string, { id: string; type: string }>()

    // Add factions
    const factions = storyPlan.factions || []
    for (const faction of factions) {
      if (faction?.name) {
        const factionId = `faction-${faction.id?.slice(0, 8) || faction.name.toLowerCase().replace(/\s+/g, '-')}`
        entityMap.set(faction.name.toLowerCase(), { id: factionId, type: 'faction' })

        // Also add "The" variants if applicable
        if (faction.name.startsWith('The ')) {
          const withoutThe = faction.name.slice(4)
          entityMap.set(withoutThe.toLowerCase(), { id: factionId, type: 'faction' })
        }
      }
    }

    // Add characters from storyPlan.keyCharacters as well
    const keyCharacters = storyPlan.keyCharacters || []
    const allCharacters = [...cast, ...keyCharacters]

    // DEBUG: console.log(`[AutoLinker] Found ${allCharacters.length} total characters`)

    for (const char of allCharacters) {
      if (char?.name) {
        const charId = `char-${char.id?.slice(0, 8) || char.name.toLowerCase().replace(/\s+/g, '-')}`
        entityMap.set(char.name.toLowerCase(), { id: charId, type: 'character' })

        // console.log(`[AutoLinker] Added character: "${char.name}" -> ${charId}`)

        // Also add first name only if it's unique
        const firstName = char.name.split(' ')[0]
        if (firstName && firstName.length > 2 && !entityMap.has(firstName.toLowerCase())) {
          entityMap.set(firstName.toLowerCase(), { id: charId, type: 'character' })
          // console.log(`[AutoLinker] Added first name: "${firstName}" -> ${charId}`)
        }

        // Also add "The" variant for titles (e.g. "The Commander")
        if (char.name.startsWith('The ')) {
          const withoutThe = char.name.slice(4)
          if (withoutThe.length > 2 && !entityMap.has(withoutThe.toLowerCase())) {
            entityMap.set(withoutThe.toLowerCase(), { id: charId, type: 'character' })
          }
        }
      }
    }

    // Add world rules (referenced by rule text)
    const worldRules = storyPlan.worldRules || []
    for (const rule of worldRules) {
      if (rule?.rule) {
        const ruleId = `rule-${rule.id?.slice(0, 8) || rule.rule.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`
        // Use first 5 words of rule as potential match
        const ruleKey = rule.rule.split(' ').slice(0, 5).join(' ').toLowerCase()
        entityMap.set(ruleKey, { id: ruleId, type: 'rule' })
      }
    }

    // Extract potential places from world description (proper nouns with "The")
    const worldDesc = storyPlan.worldDescription || seriesBible.worldDescription || ''
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
        if (placeName.length > 5 && !['The', 'A', 'An', 'In', 'On', 'At'].includes(placeName)) {
          potentialPlaces.add(placeName)
        }
      }

      // Add potential places to entity map (only if not already added)
      for (const placeName of Array.from(potentialPlaces).slice(0, 20)) {
        // Limit to 20 places
        const lowerName = placeName.toLowerCase()
        if (!entityMap.has(lowerName)) {
          const placeId = `place-${placeName.toLowerCase().replace(/\s+/g, '-')}`
          entityMap.set(lowerName, { id: placeId, type: 'place' })

          // Also add variant without "The"
          if (placeName.startsWith('The ')) {
            const withoutThe = placeName.slice(4)
            if (!entityMap.has(withoutThe.toLowerCase())) {
              entityMap.set(withoutThe.toLowerCase(), { id: placeId, type: 'place' })
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
    const existingRefPattern = /\[([^\]]+)\]\[([a-zA-Z0-9_-]+)\]/g
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
      const entity = entityMap.get(entityName)!

      // Create case-insensitive regex that matches whole words
      // Look for entity name NOT already in reference format
      const escapedName = entityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pattern = new RegExp(`(?<!\\[)\\b(${escapedName})\\b(?!\\]\\[)`, 'gi')

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
    console.warn('[AutoLinker] Failed to auto-link entities:', error)
    return text // Return original text on error
  }
}

export const entityAutoLinker = {
  autoLink: autoLinkEntities,
}
