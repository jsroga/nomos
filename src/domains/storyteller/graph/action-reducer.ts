import { WritersRoomState } from '../graph/state';
import { AgentActionValidated } from '../schemas/agent-schemas';
import { v4 as uuidv4 } from 'uuid';

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

      // TODO: Implement UPDATE_LOCATION, ADD_LORE_ENTRY, DEFINE_MAGIC_SYSTEM similarly
      // For brevity, treating bible updates generically is often enough, but explicit handling is better

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

