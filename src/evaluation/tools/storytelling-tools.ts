import OpenAI from 'openai'

// ==========================================
// TYPES
// ==========================================

export interface Tool {
  name: string
  description: string
  func: (input: string) => Promise<string>
}

// ==========================================
// PSYCHOLOGIST TOOL (Expert System for Character Profiling)
// ==========================================
// This tool exposes a "psychology expert" that can be called by agents
// to analyze character motivations, predict behavior, and inform dialogue.

/**
 * Creates a Psychologist tool for use by agentic systems.
 */
export function createPsychologistTool(): Tool {
  return {
    name: 'analyze_character_psyche',
    description:
      "Performs deep psychological analysis of a character. Input: JSON with 'characterName' and 'context'. Returns personality profile, hidden motivations, and predicted behavior.",
    func: async (input: string) => {
      try {
        const { characterName, context } = JSON.parse(input)

        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        })

        const prompt = `
You are a forensic psychologist analyzing a fictional character.

CHARACTER: ${characterName}
CONTEXT: ${context}

Provide analysis in this format:
{
  "personality_type": "e.g. Anxious Avoidant, Narcissistic, Securely Attached",
  "core_wounds": ["array of past traumas inferred from behavior"],
  "hidden_motivations": ["what they ACTUALLY want vs what they SAY they want"],
  "defense_mechanisms": ["denial, projection, rationalization, etc."],
  "predicted_behavior_under_stress": "how they will react when cornered",
  "dialogue_signature": "speech patterns, word choices, verbal tics"
}
`
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        })

        return response.choices[0].message.content || ''
      } catch (e) {
        return JSON.stringify({
          error: 'Failed to parse input. Expected JSON with characterName and context.',
        })
      }
    },
  }
}

// ==========================================
// STORY ENGINE TOOL (Conflict Injection Mechanism)
// ==========================================
// This tool generates "conflict beats" that can be injected into scenes
// to increase dramatic tension.

export function createStoryEngineTool(): Tool {
  return {
    name: 'inject_conflict',
    description:
      "Generates a dramatic conflict beat to inject into a scene. Input: JSON with 'currentScene', 'conflictType' (interpersonal|environmental|internal), and 'intensity' (1-10). Returns a conflict beat and suggested dialogue hook.",
    func: async (input: string) => {
      try {
        const { currentScene, conflictType, intensity } = JSON.parse(input)

        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        })

        const prompt = `
You are a story consultant specializing in dramatic tension.

CURRENT SCENE: ${currentScene}
CONFLICT TYPE: ${conflictType}
INTENSITY: ${intensity}/10

Generate a conflict injection:
{
  "conflict_beat": "The unexpected event or revelation",
  "character_affected": "Who is most impacted",
  "suggested_dialogue_hook": "Opening line that introduces the conflict naturally",
  "subtext_opportunity": "What can be communicated WITHOUT saying it directly",
  "escalation_path": "How this can get worse if not resolved"
}
`
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
        })

        return response.choices[0].message.content || ''
      } catch (e) {
        return JSON.stringify({
          error:
            'Failed to parse input. Expected JSON with currentScene, conflictType, and intensity.',
        })
      }
    },
  }
}

// Export toolset for agent use
const STORYTELLING_TOOLS = {
  psychologist: createPsychologistTool,
  storyEngine: createStoryEngineTool,
}
