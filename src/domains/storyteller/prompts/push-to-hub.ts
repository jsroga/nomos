/**
 * Push Prompts to LangSmith Hub
 *
 * Script to upload local prompts to LangSmith Hub for version control
 * and collaborative editing.
 *
 * Usage: npm run prompts:push
 */

import { Client } from 'langsmith'
import { PROMPT_IDS, getPromptConfig } from '../config/storyteller-config'
import {
  SUPERVISOR_REASONING,
  PLOT_ARCHITECT_REASONING,
  WRITER_REASONING,
  CHARACTER_PSYCHOLOGY_REASONING,
  DEVILS_ADVOCATE_REASONING,
  PREMISE_ARCHITECT_REASONING,
} from './reasoning-templates'

// Import agent prompts
import { SUPERVISOR_SYSTEM_PROMPT } from './agents/supervisor'
import { PLOT_ARCHITECT_STRUCTURED_PROMPT } from './agents/plot-architect'
import { WRITER_STRUCTURED_PROMPT } from './agents/writer'
import { CHARACTER_PSYCHOLOGY_PROMPT } from './agents/character-psychology'
import { DEVILS_ADVOCATE_PROMPT } from './agents/devils-advocate'
import { SCRIPT_EDITOR_PROMPT } from './agents/script-editor'
import { CONSEQUENCE_TRACKER_PROMPT } from './agents/consequence-tracker'
import { EPISODE_PREMISE_PROMPT } from './agents/episode-premise'
import { PLANNER_SYSTEM_PROMPT } from './agents/planner'
import { MAGIC_AGENT_PROMPT } from './agents/magic-agent'
import { WORLD_SIMULATOR_PROMPT } from './agents/world-simulator'
import { VISUAL_MOMENT_PROMPT } from './agents/visual-moment'

// ============================================
// FULL PROMPT DEFINITIONS
// ============================================

const FULL_PROMPTS: Record<keyof typeof PROMPT_IDS, { system: string; human: string }> = {
  supervisor: {
    system: `${SUPERVISOR_SYSTEM_PROMPT}\n\n---\n\n${SUPERVISOR_REASONING}`,
    human: '{input}',
  },

  plotArchitect: {
    system: `${PLOT_ARCHITECT_STRUCTURED_PROMPT}\n\n---\n\n${PLOT_ARCHITECT_REASONING}`,
    human: '{input}',
  },

  writer: {
    system: `${WRITER_STRUCTURED_PROMPT}\n\n---\n\n${WRITER_REASONING}`,
    human: '{input}',
  },

  premiseArchitect: {
    system: `You are the Premise Architect, responsible for world-building and establishing the foundation of the series.

## Your Domain
- World rules and systems
- Setting and tone
- Character creation
- Thematic foundation
- Series bible management

${PREMISE_ARCHITECT_REASONING}`,
    human: '{input}',
  },

  characterPsychology: {
    system: `${CHARACTER_PSYCHOLOGY_PROMPT}\n\n---\n\n${CHARACTER_PSYCHOLOGY_REASONING}`,
    human: '{input}',
  },

  devilsAdvocate: {
    system: `${DEVILS_ADVOCATE_PROMPT}\n\n---\n\n${DEVILS_ADVOCATE_REASONING}`,
    human: '{input}',
  },

  scriptEditor: {
    system: SCRIPT_EDITOR_PROMPT,
    human: '{input}',
  },

  consequenceTracker: {
    system: CONSEQUENCE_TRACKER_PROMPT,
    human: '{input}',
  },

  episodePremiseArchitect: {
    system: EPISODE_PREMISE_PROMPT,
    human: '{input}',
  },

  planner: {
    system: PLANNER_SYSTEM_PROMPT,
    human: '{input}',
  },

  magicAgent: {
    system: MAGIC_AGENT_PROMPT,
    human: '{input}',
  },

  worldSimulator: {
    system: WORLD_SIMULATOR_PROMPT,
    human: '{input}',
  },

  visualMoment: {
    system: VISUAL_MOMENT_PROMPT,
    human: '{input}',
  },

  // Section-Specific Prompts
  sectionWorldDescription: {
    system: `## SECTION UPDATE: WORLD DESCRIPTION

You are updating the core World Description of the series bible.
Focus on: tone, atmosphere, setting, and the unique "hook" of the world.

Use mergeMode "smart" to update the existing description.

Respond with:
{
  "message": "Brief explanation of the description update",
  "actions": [{
    "type": "UPDATE_WORLD_DESCRIPTION",
    "payload": {
      "worldDescription": "THE FULL UPDATED DESCRIPTION HERE",
      "mergeMode": "smart"
    }
  }],
  "confidence": 0.9
}`,
    human: '{input}',
  },

  sectionWorldRules: {
    system: `## SECTION UPDATE: WORLD RULES (Laws of the World)

You are updating ONLY the World Rules section.
Focus on: hard constraints, magic systems, physics, technology, society rules.
Rules create conflict. "Magic has a cost" is better than "Magic can do anything".

Use mergeMode "smart" to update existing rules or add new ones without losing existing content.

Respond with:
{
  "message": "Brief explanation of rules added/updated",
  "actions": [{
    "type": "UPDATE_WORLD_RULES",
    "payload": {
      "rules": [
        { "category": "Magic|Physics|Technology|Society|Politics|Economics", "rule": "The rule", "consequence": "What happens", "exceptions": null }
      ],
      "mergeMode": "smart"
    }
  }],
  "confidence": 0.9
}`,
    human: '{input}',
  },

  sectionFactions: {
    system: `## SECTION UPDATE: FACTIONS (Power & Factions)

You are updating ONLY the Factions section.
Focus on: opposing forces, incompatible goals, resources, weaknesses.
NOT just "Good vs Evil" - create moral grey areas.

Use mergeMode "smart" to update existing factions or add new ones.

Respond with:
{
  "message": "Brief explanation of factions added/updated",
  "actions": [{
    "type": "UPDATE_FACTIONS",
    "payload": {
      "factions": [
        { "id": "unique_id", "name": "Faction Name", "ideology": "Core belief", "goals": ["Goal 1"], "resources": "Their power", "weaknesses": "Achilles heel", "rivals": ["Other faction"] }
      ],
      "mergeMode": "smart"
    }
  }],
  "confidence": 0.9
}`,
    human: '{input}',
  },

  sectionInspirations: {
    system: `## SECTION UPDATE: INSPIRATIONS

You are updating ONLY the Inspirations section.
For each inspiration (book, movie, game), provide:
- title: The exact name
- description: 1-2 sentences explaining what it is and why it's relevant to this world

Choose real, existing works that match the world's tone and genre.

Use mergeMode "merge" to add to existing inspirations.

Respond with:
{
  "message": "Brief explanation of inspirations added",
  "actions": [{
    "type": "UPDATE_INSPIRATIONS",
    "payload": {
      "inspirations": { 
        "books": [{ "title": "Dune", "description": "Epic sci-fi about power, religion, and ecology on a desert planet." }], 
        "movies": [{ "title": "Blade Runner", "description": "Neo-noir vision of a dystopian future with questions about humanity." }], 
        "games": [{ "title": "Dark Souls", "description": "Grim fantasy with cryptic lore and interconnected world design." }]
      },
      "mergeMode": "merge"
    }
  }],
  "confidence": 0.9
}`,
    human: '{input}',
  },

  sectionPlotTwists: {
    system: `## SECTION UPDATE: PLOT TWISTS

You are generating/updating plot twists.
Create 3 major twists that completely recontextualize everything.
Each twist should make the audience want to rewatch from the beginning.

Respond with:
{
  "message": "Brief explanation of the twists",
  "actions": [{
    "type": "UPDATE_PLOT_TWISTS",
    "payload": {
      "plotTwists": ["Twist 1", "Twist 2", "Twist 3"],
      "mergeMode": "merge"
    }
  }],
  "confidence": 0.9
}`,
    human: '{input}',
  },

  sectionEpisodeRoadmap: {
    system: `## SECTION UPDATE: EPISODE ROADMAP (Chain-of-Thought)

You are an Elite TV Showrunner breaking a season for a premium network (HBO/Netflix).
You must plan the "Season Spine" first, then break it down into episodes.

### STEP 1: DEFINE THE SEASON SPINE
Define the macro narrative arc:
- **Inciting Incident**: The event that disrupts the status quo.
- **Midpoint Climax**: The point of no return.
- **Season Climax**: The final confrontation and resolution.
- **Theme Exploration**: How the central theme is challenged throughout the season.

### STEP 2: BREAK DOWN THE EPISODES
Generate a roadmap of episodes (typically 8-10). Each episode must be a structured chapter.
For each episode, define:
- **Title**: Evocative and thematic.
- **Logline**: A TV-Guide style summary (1 sentence).
- **Main Plot (A-Story)**: The external conflict advancement.
- **Subplot (B-Story)**: The internal/character-specific arc.
- **The Hook**: A compelling teaser/cold open description.
- **The Cliffhanger**: The reason the audience clicks "Next Episode".
- **Showrunner Reasoning**: Why is this episode necessary structurally? (e.g., "Setup for the finale", "Breather before the climax").

Respond with:
{
  "message": "Brief explanation of the season arc and roadmap",
  "actions": [{
    "type": "UPDATE_EPISODE_ROADMAP",
    "payload": {
      "seasonStructure": {
        "seasonLogline": "Elevator pitch",
        "incitingIncident": "...",
        "midpointClimax": "...",
        "seasonClimax": "...",
        "resolution": "...",
        "themeExploration": "..."
      },
      "sequences": [
        { 
          "id": 1, 
          "name": "Title", 
          "logline": "Summary",
          "description": "Full description...",
          "mainPlotBeat": "A-Story...",
          "bPlotBeat": "B-Story...",
          "hook": "Opening teaser...",
          "cliffhanger": "Ending hook...",
          "reasoning": "Structural note...",
          "keyFactionsInvolved": ["Faction"], 
          "worldConsequence": "Global impact of the episode",
          "consequences": ["Character A loses trust", "Faction B gains power"]
        }
      ],
      "executiveSummary": "A 2-3 sentence pitch summarizing the entire season arc.",
      "mergeMode": "merge"
    }
  }],
  "confidence": 0.9
}`,
    human: '{input}',
  },

  sectionKeyCharacters: {
    system: `## SECTION UPDATE: KEY CHARACTERS

You are updating ONLY the Key Characters section.
Focus on: archetypes, motivations, faction alignment.

Use mergeMode "smart" to update existing characters or add new ones.

Respond with:
{
  "message": "Brief explanation of characters added/updated",
  "actions": [{
    "type": "UPDATE_KEY_CHARACTERS",
    "payload": {
      "keyCharacters": [
        { "name": "Name", "role": "Protagonist|Antagonist|Supporting", "archetype": "The archetype", "motivation": "What drives them", "factionId": "faction_id_or_null" }
      ],
      "mergeMode": "smart"
    }
  }],
  "confidence": 0.9
}`,
    human: '{input}',
  },

  sectionSoundtracks: {
    system: `## SECTION UPDATE: SOUNDTRACKS

You are updating ONLY the Soundtracks section.
Suggest 3-5 real songs that fit the world's atmosphere.

**CRITICAL: You MUST respond with ONLY valid JSON. No prose, no explanations outside the JSON structure.**
**Do NOT describe the songs in a text list. ONLY return the JSON object below.**

You MUST respond with this EXACT JSON structure:
{
  "message": "Brief 1-line summary of music choices",
  "actions": [{
    "type": "UPDATE_SOUNDTRACKS",
    "payload": {
      "soundtracks": [
        { "title": "Song Title", "artist": "Artist Name", "youtubeUrl": "https://youtube.com/watch?v=...", "mood": "Eerie/Upbeat/etc" }
      ],
      "mergeMode": "replace"
    }
  }],
  "confidence": 0.9
}

RESPOND WITH ONLY THIS JSON. NO OTHER TEXT.`,
    human: '{input}',
  },
}

// ============================================
// PUSH FUNCTIONS
// ============================================

interface PushOptions {
  environment?: 'production' | 'staging' | 'dev'
  tags?: string[]
  makePublic?: boolean
  dryRun?: boolean
}

/**
 * Push a single prompt to LangSmith Hub using the Client API
 */
async function pushPrompt(
  client: Client,
  promptId: keyof typeof PROMPT_IDS,
  options: PushOptions = {}
): Promise<void> {
  const config = getPromptConfig()
  const { environment = 'dev', tags = [], makePublic = false, dryRun = false } = options

  const promptDef = FULL_PROMPTS[promptId]
  if (!promptDef) {
    console.warn(`⚠️ No definition found for prompt: ${promptId}`)
    return
  }

  const repoName = PROMPT_IDS[promptId]

  // Format as ChatPromptTemplate manifest
  const manifest = {
    lc: 1,
    type: 'constructor',
    id: ['langchain', 'prompts', 'chat', 'ChatPromptTemplate'],
    kwargs: {
      messages: [
        {
          lc: 1,
          type: 'constructor',
          id: ['langchain', 'prompts', 'chat', 'SystemMessagePromptTemplate'],
          kwargs: {
            prompt: {
              lc: 1,
              type: 'constructor',
              id: ['langchain', 'prompts', 'prompt', 'PromptTemplate'],
              kwargs: {
                template: promptDef.system,
                input_variables: promptDef.system.includes('{context}')
                  ? ['context']
                  : promptDef.system.includes('{unresolvedSetups}')
                    ? ['unresolvedSetups']
                    : [],
                template_format: 'f-string',
              },
            },
          },
        },
        {
          lc: 1,
          type: 'constructor',
          id: ['langchain', 'prompts', 'chat', 'HumanMessagePromptTemplate'],
          kwargs: {
            prompt: {
              lc: 1,
              type: 'constructor',
              id: ['langchain', 'prompts', 'prompt', 'PromptTemplate'],
              kwargs: {
                template: promptDef.human,
                input_variables: ['input'],
                template_format: 'f-string',
              },
            },
          },
        },
      ],
      input_variables: promptDef.system.includes('{context}') ? ['context', 'input'] : ['input'],
    },
  }

  console.log(`📤 ${dryRun ? '[DRY RUN] ' : ''}Pushing: ${repoName}`)
  console.log(`   Environment: ${environment}`)
  console.log(`   Tags: ${[environment, ...tags].join(', ')}`)

  if (dryRun) {
    console.log('   [Skipped - dry run]')
    return
  }

  try {
    // Use the LangSmith client's pushPrompt method
    await client.pushPrompt(repoName, {
      object: manifest,
      isPublic: makePublic,
      tags: [environment, ...tags],
      description: `Storyteller ${promptId} prompt`,
    })
    console.log('   ✅ Pushed successfully')
  } catch (error: any) {
    // If repo doesn't exist, try creating it first
    if (error.message?.includes('not found') || error.status === 404) {
      console.log('   Creating new prompt repo...')
      await client.pushPrompt(repoName, {
        object: manifest,
        isPublic: makePublic,
        tags: [environment, ...tags],
        description: `Storyteller ${promptId} prompt`,
      })
      console.log('   ✅ Created and pushed successfully')
    } else {
      console.error('   ❌ Failed:', error.message || error)
      throw error
    }
  }
}

/**
 * Push all prompts to LangSmith Hub
 */
async function pushAllPrompts(options: PushOptions = {}): Promise<void> {
  console.log('\n🚀 Pushing all prompts to LangSmith Hub')
  console.log('==========================================\n')

  const client = new Client({
    apiKey: process.env.LANGCHAIN_API_KEY,
  })

  const promptIds = Object.keys(PROMPT_IDS) as Array<keyof typeof PROMPT_IDS>

  let success = 0
  let failed = 0

  for (const promptId of promptIds) {
    try {
      await pushPrompt(client, promptId, options)
      success++
    } catch {
      failed++
    }
  }

  console.log('\n==========================================')
  console.log(`✅ Pushed: ${success}/${promptIds.length}`)
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`)
  }
}

// ============================================
// CLI
// ============================================

async function main() {
  const args = process.argv.slice(2)

  // Parse arguments
  const options: PushOptions = {
    environment: 'dev',
    tags: [],
    makePublic: false,
    dryRun: false,
  }

  for (const arg of args) {
    if (arg === '--production') options.environment = 'production'
    if (arg === '--staging') options.environment = 'staging'
    if (arg === '--dev') options.environment = 'dev'
    if (arg === '--public') options.makePublic = true
    if (arg === '--dry-run') options.dryRun = true
    if (arg.startsWith('--tag=')) options.tags!.push(arg.split('=')[1])
  }

  // Check for API key
  if (!process.env.LANGCHAIN_API_KEY) {
    console.error('❌ LANGCHAIN_API_KEY environment variable is required')
    process.exit(1)
  }

  const client = new Client({
    apiKey: process.env.LANGCHAIN_API_KEY,
  })

  // Check for specific prompt
  const specificPrompt = args.find(a => !a.startsWith('--')) as keyof typeof PROMPT_IDS | undefined

  if (specificPrompt && specificPrompt in PROMPT_IDS) {
    await pushPrompt(client, specificPrompt, options)
  } else {
    await pushAllPrompts(options)
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}

export { pushPrompt, pushAllPrompts, FULL_PROMPTS }
