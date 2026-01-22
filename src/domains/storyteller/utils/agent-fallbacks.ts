import {
  ActionType,
  AgentAction,
  SoundtrackTrack,
  WorldRule,
  Faction,
  KeyCharacter,
} from '../schemas/agent-schemas'
import {
  extractSoundtracksFromText,
  extractWorldRulesFromText,
  extractFactionsFromText,
  extractKeyCharactersFromText,
  extractPlotTwistsFromText,
  extractInspirationsFromText,
} from './parsers'

/**
 * Enhanced fallback to extract data from conversational response for specific section types.
 * Used when LLM doesn't follow JSON format but provides content in text.
 */
export function extractActionsFromText(
  section: string,
  messageText: string,
  existingActions: AgentAction[] = []
): AgentAction[] {
  let actions = [...existingActions]

  switch (section) {
    case 'soundtracks': {
      const existingAction = actions.find(a => a.type === 'UPDATE_SOUNDTRACKS')
      const hasValidPayload = (existingAction?.payload as any)?.soundtracks?.length > 0
      if (!hasValidPayload) {
        const soundtracks = extractSoundtracksFromText(messageText)
        if (soundtracks.length > 0) {
          console.log(`Fallback: Extracted ${soundtracks.length} soundtracks from text`)
          actions = actions.filter(a => a.type !== 'UPDATE_SOUNDTRACKS')
          actions.push({
            type: 'UPDATE_SOUNDTRACKS',
            payload: { soundtracks, mergeMode: 'replace' },
          } as any)
        }
      }
      break
    }
    case 'worldRules': {
      const existingAction = actions.find(a => a.type === 'UPDATE_WORLD_RULES')
      const hasValidPayload = (existingAction?.payload as any)?.rules?.length > 0
      if (!hasValidPayload) {
        const rules = extractWorldRulesFromText(messageText)
        if (rules.length > 0) {
          console.log(`Fallback: Extracted ${rules.length} world rules from text`)
          actions = actions.filter(a => a.type !== 'UPDATE_WORLD_RULES')
          actions.push({
            type: 'UPDATE_WORLD_RULES',
            payload: { rules, mergeMode: 'smart' },
          } as any)
        }
      }
      break
    }
    case 'factions': {
      const existingAction = actions.find(a => a.type === 'UPDATE_FACTIONS')
      const hasValidPayload = (existingAction?.payload as any)?.factions?.length > 0
      if (!hasValidPayload) {
        const factions = extractFactionsFromText(messageText)
        if (factions.length > 0) {
          console.log(`Fallback: Extracted ${factions.length} factions from text`)
          actions = actions.filter(a => a.type !== 'UPDATE_FACTIONS')
          actions.push({
            type: 'UPDATE_FACTIONS',
            payload: { factions, mergeMode: 'smart' },
          } as any)
        }
      }
      break
    }
    case 'keyCharacters': {
      const existingAction = actions.find(a => a.type === 'UPDATE_KEY_CHARACTERS')
      const hasValidPayload = (existingAction?.payload as any)?.keyCharacters?.length > 0
      if (!hasValidPayload) {
        const keyCharacters = extractKeyCharactersFromText(messageText)
        if (keyCharacters.length > 0) {
          console.log(`Fallback: Extracted ${keyCharacters.length} key characters from text`)
          actions = actions.filter(a => a.type !== 'UPDATE_KEY_CHARACTERS')
          actions.push({
            type: 'UPDATE_KEY_CHARACTERS',
            payload: { keyCharacters, mergeMode: 'smart' },
          } as any)
        }
      }
      break
    }
    case 'plotTwists': {
      const existingAction = actions.find(a => a.type === 'UPDATE_PLOT_TWISTS')
      const hasValidPayload = (existingAction?.payload as any)?.plotTwists?.length > 0
      if (!hasValidPayload) {
        const plotTwists = extractPlotTwistsFromText(messageText)
        if (plotTwists.length > 0) {
          console.log(`Fallback: Extracted ${plotTwists.length} plot twists from text`)
          actions = actions.filter(a => a.type !== 'UPDATE_PLOT_TWISTS')
          actions.push({
            type: 'UPDATE_PLOT_TWISTS',
            payload: { plotTwists, mergeMode: 'replace' },
          } as any)
        }
      }
      break
    }
    case 'inspirations': {
      const existingAction = actions.find(a => a.type === 'UPDATE_INSPIRATIONS')
      const payload = existingAction?.payload as any
      const hasValidPayload =
        payload?.inspirations &&
        (payload.inspirations.books?.length > 0 ||
          payload.inspirations.movies?.length > 0 ||
          payload.inspirations.games?.length > 0)
      if (!hasValidPayload) {
        const inspirations = extractInspirationsFromText(messageText)
        if (
          inspirations.books.length > 0 ||
          inspirations.movies.length > 0 ||
          inspirations.games.length > 0
        ) {
          console.log('Fallback: Extracted inspirations from text')
          actions = actions.filter(a => a.type !== 'UPDATE_INSPIRATIONS')
          actions.push({
            type: 'UPDATE_INSPIRATIONS',
            payload: { inspirations, mergeMode: 'replace' },
          } as any)
        }
      }
      break
    }
    case 'worldDescription': {
      const existingAction = actions.find(a => a.type === 'UPDATE_WORLD_DESCRIPTION')
      const hasValidPayload = existingAction?.payload?.description?.length > 50
      if (!hasValidPayload && messageText.length > 100) {
        console.log('Fallback: Using message as world description')
        actions = actions.filter(a => a.type !== 'UPDATE_WORLD_DESCRIPTION')
        actions.push({
          type: 'UPDATE_WORLD_DESCRIPTION',
          payload: { description: messageText },
        } as any)
      }
      break
    }
  }

  return actions
}

/**
 * Generates a user-friendly message for section updates based on extracted actions.
 */
export function generateProposalMessage(
  message: string,
  actions: AgentAction[],
  section: string
): string {
  if (actions.length === 0) return message

  const action = actions[0]
  const payload = action.payload as any

  switch (action.type) {
    case 'UPDATE_SOUNDTRACKS': {
      const soundtracks = payload?.soundtracks || []
      if (soundtracks.length > 0) {
        return (
          `Here are ${soundtracks.length} soundtrack recommendations for your approval:\n\n` +
          soundtracks
            .map(
              (s: SoundtrackTrack, i: number) =>
                `${i + 1}. **"${s.title}"** – ${s.artist}\n   ${s.mood ? `_${s.mood}_` : ''}\n   ${s.youtubeUrl || ''}`
            )
            .join('\n\n')
        )
      }
      break
    }
    case 'UPDATE_WORLD_RULES': {
      const rules = payload?.rules || []
      if (rules.length > 0) {
        return (
          `Here are ${rules.length} world rules for your approval:\n\n` +
          rules
            .slice(0, 5)
            .map((r: WorldRule, i: number) => `${i + 1}. **[${r.category}]** ${r.rule}`)
            .join('\n')
        )
      }
      break
    }
    case 'UPDATE_FACTIONS': {
      const factions = payload?.factions || []
      if (factions.length > 0) {
        return (
          `Here are ${factions.length} factions for your approval:\n\n` +
          factions
            .slice(0, 5)
            .map((f: Faction, i: number) => `${i + 1}. **${f.name}** – "${f.ideology}"`)
            .join('\n')
        )
      }
      break
    }
    case 'UPDATE_INSPIRATIONS':
      return 'Here are updated reference materials for your approval.'
    case 'UPDATE_WORLD_DESCRIPTION':
      return 'Here is an updated atmospheric description for your approval.'
    case 'UPDATE_KEY_CHARACTERS': {
      const chars = payload?.keyCharacters || []
      if (chars.length > 0) {
        return (
          `Here are ${chars.length} key characters for your approval:\n\n` +
          chars
            .slice(0, 5)
            .map(
              (c: KeyCharacter, i: number) => `${i + 1}. **${c.name}** (${c.role}) – ${c.archetype}`
            )
            .join('\n')
        )
      }
      break
    }
    case 'UPDATE_PLOT_TWISTS':
      return 'Here are plot twists for your approval.'
    case 'UPDATE_EPISODE_ROADMAP':
      return 'Here is an updated season structure and episode breakdown for your approval.'
  }

  return message
}
