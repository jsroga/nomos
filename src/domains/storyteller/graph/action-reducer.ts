import { WritersRoomState } from '../graph/state';
import { AgentActionValidated, WorldRule, Faction } from '../schemas/agent-schemas';
import { v4 as uuidv4 } from 'uuid';

// =================================================================
// SMART MERGE HELPERS
// =================================================================

/**
 * Smart merge for world rules - matches by rule text
 */
function smartMergeWorldRules(
  existing: WorldRule[],
  incoming: WorldRule[],
  mode: 'replace' | 'merge' | 'smart'
): WorldRule[] {
  if (mode === 'replace') return incoming;
  if (mode === 'merge') return [...existing, ...incoming];

  // Smart mode: match by rule text, update if found, add if not
  const result = [...existing];
  for (const newRule of incoming) {
    const existingIndex = result.findIndex(r =>
      r.rule.toLowerCase() === newRule.rule.toLowerCase() ||
      r.category === newRule.category && r.rule.includes(newRule.rule.substring(0, 20))
    );
    if (existingIndex >= 0) {
      // Update existing rule
      result[existingIndex] = { ...result[existingIndex], ...newRule };
    } else {
      // Add new rule
      result.push(newRule);
    }
  }
  return result;
}

/**
 * Smart merge for factions - matches by id or name
 */
function smartMergeFactions(
  existing: Faction[],
  incoming: Faction[],
  mode: 'replace' | 'merge' | 'smart'
): Faction[] {
  if (mode === 'replace') return incoming;
  if (mode === 'merge') return [...existing, ...incoming];

  // Smart mode: match by id or name
  const result = [...existing];
  for (const newFaction of incoming) {
    const existingIndex = result.findIndex(f =>
      f.id === newFaction.id ||
      f.name.toLowerCase() === newFaction.name.toLowerCase()
    );
    if (existingIndex >= 0) {
      // Update existing faction, merge arrays
      result[existingIndex] = {
        ...result[existingIndex],
        ...newFaction,
        goals: [...new Set([...(result[existingIndex].goals || []), ...(newFaction.goals || [])])],
        rivals: newFaction.rivals || result[existingIndex].rivals
      };
    } else {
      // Add new faction with generated id if missing
      result.push({ ...newFaction, id: newFaction.id || uuidv4() });
    }
  }
  return result;
}

/**
 * Smart merge for key characters - matches by name
 */
function smartMergeKeyCharacters(
  existing: Array<{ name: string; role: string; archetype: string; motivation: string; factionId?: string | null }>,
  incoming: Array<{ name: string; role: string; archetype: string; motivation: string; factionId?: string | null }>,
  mode: 'replace' | 'merge' | 'smart'
): Array<{ name: string; role: string; archetype: string; motivation: string; factionId?: string | null }> {
  if (mode === 'replace') return incoming;
  if (mode === 'merge') return [...existing, ...incoming];

  // Smart mode: match by name
  const result = [...existing];
  for (const newChar of incoming) {
    const existingIndex = result.findIndex(c =>
      c.name.toLowerCase() === newChar.name.toLowerCase()
    );
    if (existingIndex >= 0) {
      result[existingIndex] = { ...result[existingIndex], ...newChar };
    } else {
      result.push(newChar);
    }
  }
  return result;
}

/**
 * Simple merge for string arrays (inspirations, plot twists)
 */
function mergeStringArrays(
  existing: string[] | undefined,
  incoming: string[],
  mode: 'replace' | 'merge' | null | undefined
): string[] {
  if (mode === 'replace' || !mode) return incoming;
  return [...new Set([...(existing || []), ...incoming])];
}

/**
 * Processes a list of agent actions and returns the updated state partial.
 */
export function reduceAgentActions(
  state: WritersRoomState,
  actions: AgentActionValidated[]
): Partial<WritersRoomState> {
  if (!actions || actions.length === 0) return {};

  let updates: Partial<WritersRoomState> = {};

  // Helper to get current state (merging updates as we go)
  const getCurrentState = () => ({ ...state, ...updates });

  for (const action of actions) {
    switch (action.type) {
      // =================================================================
      // SERIES BIBLE ACTIONS
      // =================================================================
      case 'UPDATE_SERIES_BIBLE': {
        const currentBible = getCurrentState().seriesBible || {};
        updates.seriesBible = {
          ...currentBible,
          ...action.payload,
          // Merge arrays if they exist
          themes: [
            ...(currentBible.themes || []),
            ...(action.payload.themes || [])
          ].filter((v, i, a) => a.indexOf(v) === i), // Unique
          worldRules: [
            ...(currentBible.worldRules || []),
            ...(action.payload.worldRules || [])
          ].filter((v, i, a) => a.indexOf(v) === i),
        };
        break;
      }

      case 'SET_GENRE_AND_TONE': {
        const currentBible = getCurrentState().seriesBible || {};
        updates.seriesBible = {
          ...currentBible,
          genre: action.payload.genre,
          tone: action.payload.tone,
          styleReference: action.payload.styleReference || currentBible.styleReference
        };
        break;
      }

      case 'ADD_THEME': {
        const currentBible = getCurrentState().seriesBible || {};
        const themes = currentBible.themes || [];
        if (!themes.includes(action.payload.theme)) {
          updates.seriesBible = {
            ...currentBible,
            themes: [...themes, action.payload.theme]
          };
        }
        break;
      }

      case 'REMOVE_THEME': {
        const currentBible = getCurrentState().seriesBible || {};
        const themes = currentBible.themes || [];
        updates.seriesBible = {
          ...currentBible,
          themes: themes.filter((t: string) => t !== action.payload.theme)
        };
        break;
      }

      case 'CREATE_LOCATION': {
        const currentBible = getCurrentState().seriesBible || {};
        const locations = currentBible.locations || [];
        const newLocation = {
          id: uuidv4(),
          ...action.payload
        };
        updates.seriesBible = {
          ...currentBible,
          locations: [...locations, newLocation]
        };
        break;
      }

      // =================================================================
      // PARTIAL BIBLE UPDATE ACTIONS (SMART MERGE)
      // =================================================================

      case 'UPDATE_WORLD_RULES': {
        const currentBible = getCurrentState().seriesBible || {};
        const storyPlan = currentBible.storyPlan || {};
        const existingRules = storyPlan.worldRules || currentBible.worldRules || [];
        const mergedRules = smartMergeWorldRules(existingRules, action.payload.rules, action.payload.mergeMode);

        updates.seriesBible = {
          ...currentBible,
          worldRules: mergedRules,
          storyPlan: {
            ...storyPlan,
            worldRules: mergedRules
          }
        };
        break;
      }

      case 'UPDATE_FACTIONS': {
        const currentBible = getCurrentState().seriesBible || {};
        const storyPlan = currentBible.storyPlan || {};
        const existingFactions = storyPlan.factions || currentBible.factions || [];
        const mergedFactions = smartMergeFactions(existingFactions, action.payload.factions, action.payload.mergeMode);

        updates.seriesBible = {
          ...currentBible,
          factions: mergedFactions,
          storyPlan: {
            ...storyPlan,
            factions: mergedFactions
          }
        };
        break;
      }

      case 'UPDATE_INSPIRATIONS': {
        const currentBible = getCurrentState().seriesBible || {};
        const storyPlan = currentBible.storyPlan || {};
        const currentInspirations = storyPlan.inspirations || currentBible.inspirations || { books: [], movies: [], games: [] };
        const mode = action.payload.mergeMode;

        const mergedInspirations = {
          books: action.payload.inspirations.books
            ? mergeStringArrays(currentInspirations.books, action.payload.inspirations.books, mode)
            : currentInspirations.books || [],
          movies: action.payload.inspirations.movies
            ? mergeStringArrays(currentInspirations.movies, action.payload.inspirations.movies, mode)
            : currentInspirations.movies || [],
          games: action.payload.inspirations.games
            ? mergeStringArrays(currentInspirations.games, action.payload.inspirations.games, mode)
            : currentInspirations.games || []
        };

        updates.seriesBible = {
          ...currentBible,
          inspirations: mergedInspirations,
          storyPlan: {
            ...storyPlan,
            inspirations: mergedInspirations
          }
        };
        break;
      }

      case 'UPDATE_WORLD_DESCRIPTION': {
        const currentBible = getCurrentState().seriesBible || {};
        const storyPlan = currentBible.storyPlan || {};

        updates.seriesBible = {
          ...currentBible,
          worldDescription: action.payload.description,
          storyPlan: {
            ...storyPlan,
            worldDescription: action.payload.description
          }
        };
        break;
      }

      case 'UPDATE_MOOD_SOUNDTRACK': {
        const currentBible = getCurrentState().seriesBible || {};
        const storyPlan = currentBible.storyPlan || {};

        updates.seriesBible = {
          ...currentBible,
          moodSoundtrack: action.payload.moodSoundtrack,
          storyPlan: {
            ...storyPlan,
            moodSoundtrack: action.payload.moodSoundtrack
          }
        };
        break;
      }

      case 'UPDATE_PLOT_TWISTS': {
        const currentBible = getCurrentState().seriesBible || {};
        const storyPlan = currentBible.storyPlan || {};
        const existingTwists = storyPlan.plotTwists || [];
        const mergedTwists = mergeStringArrays(existingTwists, action.payload.plotTwists, action.payload.mergeMode);

        updates.seriesBible = {
          ...currentBible,
          storyPlan: {
            ...storyPlan,
            plotTwists: mergedTwists
          }
        };
        break;
      }

      case 'UPDATE_KEY_CHARACTERS': {
        const currentBible = getCurrentState().seriesBible || {};
        const storyPlan = currentBible.storyPlan || {};
        const existingChars = storyPlan.keyCharacters || currentBible.keyCharacters || [];
        const mergedChars = smartMergeKeyCharacters(existingChars, action.payload.keyCharacters, action.payload.mergeMode);

        updates.seriesBible = {
          ...currentBible,
          keyCharacters: mergedChars,
          storyPlan: {
            ...storyPlan,
            keyCharacters: mergedChars
          }
        };
        break;
      }

      case 'UPDATE_EPISODE_ROADMAP': {
        const currentBible = getCurrentState().seriesBible || {};
        const storyPlan = currentBible.storyPlan || {};
        const existingSequences = storyPlan.sequences || [];
        const mode = action.payload.mergeMode;

        let mergedSequences;
        if (mode === 'merge') {
          // Merge by id, update existing or append new
          mergedSequences = [...existingSequences];
          for (const newSeq of action.payload.sequences) {
            const existingIndex = mergedSequences.findIndex(s => s.id === newSeq.id);
            if (existingIndex >= 0) {
              mergedSequences[existingIndex] = { ...mergedSequences[existingIndex], ...newSeq };
            } else {
              mergedSequences.push(newSeq);
            }
          }
        } else {
          // Replace
          mergedSequences = action.payload.sequences;
        }

        updates.seriesBible = {
          ...currentBible,
          storyPlan: {
            ...storyPlan,
            sequences: mergedSequences
          }
        };
        break;
      }

      // =================================================================
      // CHARACTER ACTIONS
      // =================================================================
      case 'CREATE_CHARACTER': {
        const currentCharacters = getCurrentState().characters || [];
        const newCharacter = {
          characterId: uuidv4(),
          name: action.payload.name,
          role: action.payload.role,
          description: action.payload.description || '',
          archetype: action.payload.archetype,
          currentGoals: [],
          fears: [],
          metrics: { // Default metrics
            valence: 0, arousal: 50, autonomy: 50, competence: 50,
            relatedness: 50, cognitiveClarity: 70, perceivedStakes: 30,
            socialSafety: 60, moralAlignment: 50, transformation: 0
          }
        };
        // @ts-ignore - partial match to CharacterState
        updates.characters = [...currentCharacters, newCharacter];
        break;
      }

      case 'UPDATE_CHARACTER_PROFILE': {
        const currentCharacters = getCurrentState().characters || [];
        updates.characters = currentCharacters.map(char => {
          if (char.characterId === action.payload.characterId || char.name === action.payload.characterId) {
            return {
              ...char,
              description: action.payload.updates.description || char.description,
              // simplistic trait merge
              traits: [...(char.traits || []), ...(action.payload.updates.traits || [])]
            };
          }
          return char;
        });
        break;
      }

      case 'SET_CHARACTER_GOAL': {
        const currentCharacters = getCurrentState().characters || [];
        updates.characters = currentCharacters.map(char => {
          if (char.characterId === action.payload.characterId || char.name === action.payload.characterId) {
            return {
              ...char,
              currentGoals: [...(char.currentGoals || []), action.payload.goal]
            };
          }
          return char;
        });
        break;
      }

      // =================================================================
      // BEAT BOARD ACTIONS
      // =================================================================
      case 'CREATE_BEAT': {
        const currentBeats = getCurrentState().beatBoard || [];
        const newBeat = {
          id: uuidv4(),
          episodeId: state.episodeId || 'EP_01',
          sequence: currentBeats.length + 1,
          status: 'proposed' as const,
          ...action.payload,
        };
        updates.beatBoard = [...currentBeats, newBeat];
        // Automatically set this as the current beat for review
        updates.currentBeat = newBeat;
        break;
      }

      case 'UPDATE_BEAT_CONTENT':
      case 'UPDATE_BEAT': {
        const payload = action.type === 'UPDATE_BEAT_CONTENT'
          ? { beatId: action.payload.beatId, updates: action.payload }
          : action.payload;

        const currentBeats = getCurrentState().beatBoard || [];
        updates.beatBoard = currentBeats.map((beat) => {
          if (beat.id === payload.beatId) {
            return {
              ...beat,
              ...payload.updates,
            };
          }
          return beat;
        });
        break;
      }

      case 'DELETE_BEAT': {
        const currentBeats = getCurrentState().beatBoard || [];
        updates.beatBoard = currentBeats.filter(
          (b) => b.id !== action.payload.beatId
        );
        break;
      }

      case 'REORDER_BEAT': {
        const currentBeats = [...(getCurrentState().beatBoard || [])];
        const beatIndex = currentBeats.findIndex(b => b.id === action.payload.beatId);
        if (beatIndex > -1) {
          const [beat] = currentBeats.splice(beatIndex, 1);
          currentBeats.splice(action.payload.newIndex, 0, beat);
          // Re-assign sequence numbers
          updates.beatBoard = currentBeats.map((b, idx) => ({
            ...b,
            sequence: idx + 1
          }));
        }
        break;
      }



      // =================================================================
      // SCRIPT ACTIONS
      // =================================================================
      case 'UPDATE_SCRIPT_CONTENT': {
        const currentScript = getCurrentState().script || "";
        if (action.payload.append) {
          updates.script = currentScript + "\n\n" + action.payload.content;
        } else {
          updates.script = action.payload.content;
        }
        break;
      }

      case 'CREATE_SCENE': {
        const currentScript = getCurrentState().script || "";
        const sceneText = `\n\n${action.payload.heading.toUpperCase()}\n\n${action.payload.action || ''}`;
        updates.script = currentScript + sceneText;
        break;
      }

      case 'UPDATE_DIALOGUE': {
        // This implies parsing the script to find the scene/line. 
        // For MVP, we might just append a note or handle it via string replacement if we had better structured script state.
        // Current implementation: Append as correction
        const currentScript = getCurrentState().script || "";
        // Very naive append
        updates.script = currentScript + `\n\n[REVISION: ${action.payload.characterName}: ${action.payload.newDialogue}]`;
        break;
      }
    }
  }

  return updates;
}

