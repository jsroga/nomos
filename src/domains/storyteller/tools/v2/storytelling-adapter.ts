import { createTool } from '@mastra/core/tools'
import { GetPlotPhaseInputSchema, ValidateConsistencyInputSchema } from './schemas'
import { db } from '@/lib/db'
import { episodes } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const HEROS_JOURNEY_TEMPLATE = {
  phases: [
    {
      id: 'ordinary_world',
      name: 'Ordinary World',
      description: 'Establish the hero\'s normal life before the adventure.',
    },
    {
      id: 'call_to_adventure',
      name: 'Call to Adventure',
      description: 'The hero encounters a problem that disrupts their world.',
    },
    {
      id: 'refusal_of_call',
      name: 'Refusal of the Call',
      description: 'Hero hesitates or refuses the challenge.',
    },
    {
      id: 'meeting_mentor',
      name: 'Meeting the Mentor',
      description: 'The hero meets a guide who prepares them.',
    },
    {
      id: 'crossing_threshold',
      name: 'Crossing the Threshold',
      description: 'Hero commits to the adventure and enters a new world.',
    },
    {
      id: 'tests_allies_enemies',
      name: 'Tests, Allies, Enemies',
      description: 'Hero faces challenges and makes allies/enemies.',
    },
    {
      id: 'approach_cave',
      name: 'Approach to the Inmost Cave',
      description: 'Hero approaches the major challenge.',
    },
    { id: 'ordeal', name: 'The Ordeal', description: 'Hero faces their greatest fear or enemy.' },
    {
      id: 'reward',
      name: 'Reward (Seizing the Sword)',
      description: 'Hero achieves the goal or gains a reward.',
    },
    { id: 'road_back', name: 'The Road Back', description: 'Hero begins the journey home.' },
    {
      id: 'resurrection',
      name: 'Resurrection',
      description: 'Final test where hero is transformed.',
    },
    {
      id: 'return_with_elixir',
      name: 'Return with the Elixir',
      description: 'Hero returns home with knowledge or power.',
    },
  ],
}

export const getPlotPhaseTool = createTool({
  id: 'get_plot_phase',
  description:
    'Get the current phase in the Hero\'s Journey framework based on story progress (chapter number).',
  inputSchema: GetPlotPhaseInputSchema,
  execute: async (args: any) => {
    const context = args?.context || args
    const { currentChapter } = context
    // Map chapter to phase: chapter 1 = Ordinary World, chapter 2 = Call to Adventure, etc.
    const phaseIndex = Math.min(currentChapter - 1, HEROS_JOURNEY_TEMPLATE.phases.length - 1)
    const phase = HEROS_JOURNEY_TEMPLATE.phases[phaseIndex]

    return JSON.stringify({
      phase: phase.name,
      chapter: currentChapter,
      description: phase.description,
      framework: 'Hero\'s Journey',
    })
  },
})

export const validateConsistencyTool = createTool({
  id: 'validate_consistency',
  description: 'Validate story consistency by checking proposed beats against established facts.',
  inputSchema: ValidateConsistencyInputSchema,
  execute: async (args: any) => {
    const context = args?.context || args
    const { proposedBeat, establishedFacts } = context
    const conflicts: string[] = []

    // Simple rule-based consistency checking
    const proposedLower = proposedBeat.toLowerCase()

    for (const fact of establishedFacts) {
      const factLower = fact.toLowerCase()

      // Check for dead/alive conflicts
      const deadMatch = factLower.match(/(\w+)\s+is\s+dead/)
      if (deadMatch) {
        const deadPerson = deadMatch[1]
        // Check if proposed beat has this person doing something alive people do
        if (
          proposedLower.includes(deadPerson.toLowerCase()) &&
          (proposedLower.includes('alive') ||
            proposedLower.includes('visits') ||
            proposedLower.includes('walks') ||
            proposedLower.includes('says') ||
            proposedLower.includes('speaks'))
        ) {
          conflicts.push(`Conflict: "${fact}" contradicts "${proposedBeat}"`)
        }
      }

      // Check for location conflicts
      const locationMatch = factLower.match(/(\w+)\s+is\s+in\s+(\w+)/)
      if (locationMatch) {
        const person = locationMatch[1]
        const location = locationMatch[2]
        // Check if proposed has person in different location
        const proposedLocationMatch = proposedLower.match(
          new RegExp(`${person}.*\\s+in\\s+(\\w+)`, 'i')
        )
        if (
          proposedLocationMatch &&
          proposedLocationMatch[1].toLowerCase() !== location.toLowerCase()
        ) {
          conflicts.push(
            `Location conflict: ${person} cannot be in ${proposedLocationMatch[1]} when established as in ${location}`
          )
        }
      }
    }

    return JSON.stringify({
      isConsistent: conflicts.length === 0,
      conflicts,
      proposedBeat,
      checkedAgainst: establishedFacts.length,
    })
  },
})

export const updateStoryPhaseTool = createTool({
  id: 'update_story_phase',
  description:
    'Update the current phase of the story episode (e.g., \'premise\', \'breaking\', \'writing\', \'complete\').',
  inputSchema: z.object({
    episodeId: z.string(),
    phase: z.enum(['premise', 'breaking', 'writing', 'complete']),
  }),
  execute: async (args: any) => {
    const context = args?.context || args
    const { episodeId, phase } = context
    try {
      await db
        .update(episodes)
        .set({
          currentPhase: phase,
          updatedAt: new Date(),
        })
        .where(eq(episodes.id, episodeId))

      return JSON.stringify({
        success: true,
        message: `Story phase updated to ${phase}`,
        phase,
      })
    } catch (error) {
      console.error('Failed to update phase:', error)
      return JSON.stringify({ success: false, error: 'Failed to update phase' })
    }
  },
})
