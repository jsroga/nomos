import { StoryPlan, KeyCharacter } from '../schemas/agent-schemas'

/**
 * Gets the list of key characters, including compatibility mapping for legacy "protagonist" field.
 */
export function getDisplayCharacters(storyPlan: StoryPlan): KeyCharacter[] {
  // 1. Gather all potential character sources
  const sources = [
    storyPlan.keyCharacters,
    (storyPlan as any).characters,
    (storyPlan as any).cast,
    (storyPlan as any).keyPlayers,
    (storyPlan as any).key_players,
    (storyPlan as any).updatedFields?.characters
  ]

  // 2. Flatten and filter
  const allRawCharacters = sources.filter(Boolean).flat()

  // 3. Normalize and Deduplicate by name
  const charactersMap = new Map<string, KeyCharacter>()

  allRawCharacters.forEach((char: any) => {
    if (!char || !char.name) return

    const normalized: KeyCharacter = {
      name: char.name,
      role: char.role || char.archetype || 'Supporting',
      archetype: char.archetype || char.role || 'Unknown',
      motivation: char.motivation || char.want || char.description || char.goal || 'No motivation set',
      factionId: char.factionId || null
    }

    if (!charactersMap.has(normalized.name)) {
      charactersMap.set(normalized.name, normalized)
    }
  })

  const characters = Array.from(charactersMap.values())

  // Backwards compatibility for old "protagonist" field
  if (storyPlan.protagonist && !characters.find(c => c.name === storyPlan.protagonist?.name)) {
    characters.push({
      name: storyPlan.protagonist.name,
      role: 'Protagonist',
      archetype: 'Hero',
      motivation: storyPlan.protagonist.want || 'No motivation set',
      factionId: null,
    })
  }

  return characters
}
