import { StoryPlan, KeyCharacter } from '../schemas/agent-schemas'

/**
 * Gets the list of key characters, including compatibility mapping for legacy "protagonist" field.
 */
export function getDisplayCharacters(storyPlan: StoryPlan): KeyCharacter[] {
  const characters = [...(storyPlan.keyCharacters || [])]

  // Backwards compatibility for old "protagonist" field
  if (storyPlan.protagonist && !characters.find(c => c.name === storyPlan.protagonist?.name)) {
    characters.push({
      name: storyPlan.protagonist.name,
      role: 'Protagonist',
      archetype: 'Hero',
      motivation: storyPlan.protagonist.want,
      factionId: null,
    })
  }

  return characters
}
