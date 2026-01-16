/**
 * Premise Architect Agent
 *
 * Generates the "World Bible" and "Initial Conflicts" (The Gardener Approach).
 * Instead of a rigid 8-sequence structure, this builds the soil (World),
 * plants the seeds (Factions/Characters), and watches them grow (Inciting Incident).
 *
 * Supports section-focused updates with smart merge capabilities.
 *
 * NEW: Supports token-level streaming for better UX during long generations.
 */

import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { WritersRoomState } from '../graph/state'
import { getModel } from '../config/model-config'
import { AgentAction } from '../actions/types'
import {
  PremiseArchitectResponseSchema,
  PremiseArchitectResponse,
  parseAgentResponse,
  StoryPlanSchema,
} from '../schemas/agent-schemas'

import { getSafeMessageHistory } from '../utils/message-utils'
import { StreamCallback, WritersRoomStateWithStream } from '../guardrails/types'
import { loadPromptCached } from '../prompts/hub-loader'
import { PROMPT_IDS } from '../config/storyteller-config'

const SECTION_TO_PROMPT_ID: Record<BibleSection, keyof typeof PROMPT_IDS> = {
  worldDescription: 'sectionWorldDescription',
  worldRules: 'sectionWorldRules',
  factions: 'sectionFactions',
  inspirations: 'sectionInspirations',
  plotTwists: 'sectionPlotTwists',
  episodeRoadmap: 'sectionEpisodeRoadmap',
  keyCharacters: 'sectionKeyCharacters',
  soundtracks: 'sectionSoundtracks',
  full: 'premiseArchitect',
}

// Model is created inside the function to use request-scoped config (AsyncLocalStorage)

// =================================================================
// SECTION-FOCUSED UPDATE DETECTION
// =================================================================

type BibleSection =
  | 'worldDescription'
  | 'worldRules'
  | 'factions'
  | 'inspirations'
  | 'plotTwists'
  | 'episodeRoadmap'
  | 'episodeRoadmap'
  | 'keyCharacters'
  | 'soundtracks'
  | 'full'

interface SectionDetection {
  section: BibleSection
  instruction: string
}

/**
 * Detect which bible section the user wants to update based on their message
 */
function detectTargetSection(userMessage: string): SectionDetection {
  const msg = userMessage.toLowerCase()

  // World Description
  if (
    msg.includes('world description') ||
    msg.includes('world bible') ||
    (msg.includes('description') && msg.includes('world'))
  ) {
    return { section: 'worldDescription', instruction: userMessage }
  }

  // World Rules / Laws
  if (
    msg.includes('world rules') ||
    msg.includes('laws of') ||
    msg.includes('rules') ||
    msg.includes('magic system') ||
    msg.includes('laws of the world')
  ) {
    return { section: 'worldRules', instruction: userMessage }
  }

  // Factions
  if (
    msg.includes('faction') ||
    msg.includes('power') ||
    msg.includes('groups') ||
    msg.includes('organizations')
  ) {
    return { section: 'factions', instruction: userMessage }
  }

  // Inspirations
  if (
    msg.includes('inspiration') ||
    msg.includes('reference') ||
    msg.includes('books') ||
    msg.includes('movies') ||
    msg.includes('games')
  ) {
    return { section: 'inspirations', instruction: userMessage }
  }

  // Plot Twists
  if (msg.includes('plot twist') || msg.includes('twist') || msg.includes('surprise')) {
    return { section: 'plotTwists', instruction: userMessage }
  }

  // Episode Roadmap
  if (
    msg.includes('episode') ||
    msg.includes('roadmap') ||
    msg.includes('season') ||
    msg.includes('arc breakdown')
  ) {
    return { section: 'episodeRoadmap', instruction: userMessage }
  }

  // Key Characters
  if (
    msg.includes('character') ||
    msg.includes('key player') ||
    msg.includes('protagonist') ||
    msg.includes('antagonist')
  ) {
    return { section: 'keyCharacters', instruction: userMessage }
  }

  // Soundtracks
  if (
    msg.includes('soundtrack') ||
    msg.includes('music') ||
    msg.includes('songs') ||
    msg.includes('playlist')
  ) {
    return { section: 'soundtracks', instruction: userMessage }
  }

  // Default to full bible
  return { section: 'full', instruction: userMessage }
}

// =================================================================
// SECTION-SPECIFIC PROMPTS
// =================================================================

const SECTION_PROMPTS: Record<BibleSection, string> = {
  worldDescription: `
## SECTION UPDATE: WORLD DESCRIPTION

You are updating ONLY the World Description section of an existing bible.
Focus on: atmosphere, sensory details, visual style, and the feel of the world.

Respond with:
{
  "message": "Brief explanation of what you enhanced",
  "actions": [{
    "type": "UPDATE_WORLD_DESCRIPTION",
    "payload": { "description": "Your vivid, atmospheric world description" }
  }],
  "confidence": 0.9
}
`,

  worldRules: `
## SECTION UPDATE: WORLD RULES (Laws of the World)

You are updating ONLY the World Rules section.
Focus on: hard constraints, magic systems, physics, technology, society rules.
Rules create conflict. "Magic has a cost" is better than "Magic can do anything".

⚠️ LIMIT: Maximum 6 rules total. Focus on the most impactful constraints.

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
}
`,

  factions: `
## SECTION UPDATE: FACTIONS (Power & Factions)

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
}
`,

  inspirations: `
## SECTION UPDATE: INSPIRATIONS

You are updating ONLY the Inspirations section.
For each inspiration (book, movie, game), provide:
- title: The exact name
- description: 1-2 sentences explaining what it is and why it's relevant to this world

⚠️ LIMIT: Maximum 3 books, 3 movies, 3 games.

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
}
`,

  plotTwists: `
## SECTION UPDATE: PLOT TWISTS

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
}
`,

  episodeRoadmap: `
## SECTION UPDATE: EPISODE ROADMAP (Chain-of-Thought)

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
}
`,

  keyCharacters: `
## SECTION UPDATE: KEY CHARACTERS

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
}
`,

  soundtracks: `
## SECTION UPDATE: SOUNDTRACKS

You are suggesting NEW soundtracks for this world.
**IMPORTANT: Generate FRESH song suggestions. Do NOT repeat any tracks that may have been suggested before.**

Requirements:
- Suggest 3-5 REAL songs with actual YouTube URLs
- Songs must fit the world's tone and atmosphere
- Each song must be different from any previously suggested tracks
- Include variety in artists and moods

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

RESPOND WITH ONLY THIS JSON. NO OTHER TEXT.
`,

  full: '', // Uses the standard PREMISE_ARCHITECT_PROMPT
}

/**
 * Build minimal context for a section update
 * Only includes the current section content for smart merging
 */
function buildSectionContext(section: BibleSection, bible: any, storyPlan: any): string {
  const parts: string[] = []

  // Always include world description for context
  if (storyPlan.worldDescription || bible.worldDescription) {
    const desc = storyPlan.worldDescription || bible.worldDescription
    parts.push(`**World Description (Summary):** ${desc.substring(0, 200)}...`)
  }

  switch (section) {
    case 'worldRules':
      const rules = storyPlan.worldRules || bible.worldRules || []
      if (rules.length > 0) {
        parts.push('\n**Existing World Rules:**')
        rules.forEach((r: any, i: number) => {
          if (typeof r === 'string') {
            parts.push(`${i + 1}. ${r}`)
          } else {
            parts.push(`${i + 1}. [${r.category}] ${r.rule} → ${r.consequence}`)
          }
        })
      }
      break

    case 'factions':
      const factions = storyPlan.factions || bible.factions || []
      if (factions.length > 0) {
        parts.push('\n**Existing Factions:**')
        factions.forEach((f: any) => {
          parts.push(`- ${f.name}: "${f.ideology}" - Goals: ${f.goals?.join(', ')}`)
        })
      }
      break

    case 'inspirations':
      const insp = storyPlan.inspirations || bible.inspirations
      if (insp) {
        parts.push('\n**Existing Inspirations:**')
        if (insp.books?.length) parts.push(`- Books: ${insp.books.join(', ')}`)
        if (insp.movies?.length) parts.push(`- Movies: ${insp.movies.join(', ')}`)
        if (insp.games?.length) parts.push(`- Games: ${insp.games.join(', ')}`)
      }
      break

    case 'plotTwists':
      const twists = storyPlan.plotTwists || []
      if (twists.length > 0) {
        parts.push('\n**Existing Plot Twists:**')
        twists.forEach((t: string, i: number) => parts.push(`${i + 1}. ${t}`))
      }
      break

    case 'episodeRoadmap':
      const seqs = storyPlan.sequences || []
      const seasonStruct = storyPlan.seasonStructure

      if (seasonStruct) {
        parts.push('\n**Existing Season Structure:**')
        parts.push(`- Logline: ${seasonStruct.seasonLogline}`)
        parts.push(`- Inciting Incident: ${seasonStruct.incitingIncident}`)
        parts.push(`- Midpoint: ${seasonStruct.midpointClimax}`)
        parts.push(`- Climax: ${seasonStruct.seasonClimax}`)
      }

      if (seqs.length > 0) {
        parts.push('\n**Existing Episode Roadmap:**')
        seqs.forEach((s: any) =>
          parts.push(`- Ep ${s.id}: ${s.name} - ${s.logline || s.description}`)
        )
      }
      break

    case 'keyCharacters':
      const chars = storyPlan.keyCharacters || bible.keyCharacters || []
      if (chars.length > 0) {
        parts.push('\n**Existing Key Characters:**')
        chars.forEach((c: any) =>
          parts.push(`- ${c.name} (${c.role}): ${c.archetype} - ${c.motivation}`)
        )
      }
      break

    case 'soundtracks':
      const existingSoundtracks = storyPlan.soundtracks || []
      if (existingSoundtracks.length > 0) {
        parts.push('\n**⚠️ EXISTING SOUNDTRACKS (DO NOT SUGGEST THESE AGAIN):**')
        existingSoundtracks.forEach((s: any) => parts.push(`- "${s.title}" by ${s.artist}`))
        parts.push('\n**You MUST suggest DIFFERENT tracks from the ones listed above.**')
      }
      break
  }

  return parts.join('\n')
}

// ============================================
// STREAMING HELPER FOR FULL BIBLE GENERATION
// ============================================

/**
 * Stream the premise generation with token-by-token progress callbacks
 */
async function streamPremiseGeneration(
  model: any,
  messages: any[],
  streamCallback: StreamCallback
): Promise<{ parsed: PremiseArchitectResponse | null; fullContent: string }> {
  let fullContent = ''
  let tokenCount = 0

  try {
    // Use model.stream() for token-by-token streaming
    const stream = await model.stream(messages)

    for await (const chunk of stream) {
      const token = typeof chunk.content === 'string' ? chunk.content : ''
      if (token) {
        fullContent += token
        tokenCount++

        // Emit token progress every token (or could batch for performance)
        streamCallback({
          type: 'token',
          agent: 'PremiseArchitect',
          token,
          progress: Math.min(tokenCount / 100, 0.99), // Rough progress estimate
        })

        // Detect sections being generated and emit section progress
        detectAndEmitSectionProgress(fullContent, streamCallback)
      }
    }

    // Signal streaming complete
    streamCallback({
      type: 'section_complete',
      agent: 'PremiseArchitect',
      section: 'full_bible',
      content: fullContent.substring(0, 200) + '...', // Preview
    })

    // Parse the accumulated content
    const parsed = parseAgentResponse(fullContent, PremiseArchitectResponseSchema)

    return {
      parsed: parsed || {
        message: extractMessageFromContent(fullContent),
        actions: [],
        confidence: 0.5,
      },
      fullContent,
    }
  } catch (error) {
    console.error('Streaming error in Premise Architect:', error)

    // Return what we have so far
    return {
      parsed: {
        message: fullContent || 'Error during generation',
        actions: [],
        confidence: 0.3,
      },
      fullContent,
    }
  }
}

/**
 * Detect which section of the bible is being generated and emit progress
 */
let lastDetectedSection = ''
function detectAndEmitSectionProgress(content: string, streamCallback: StreamCallback) {
  const sectionMarkers = [
    { marker: '"worldDescription"', section: 'worldDescription' },
    { marker: '"worldRules"', section: 'worldRules' },
    { marker: '"factions"', section: 'factions' },
    { marker: '"keyCharacters"', section: 'keyCharacters' },
    { marker: '"plotTwists"', section: 'plotTwists' },
    { marker: '"sequences"', section: 'episodeRoadmap' },
    { marker: '"inspirations"', section: 'inspirations' },
  ]

  for (const { marker, section } of sectionMarkers) {
    if (content.includes(marker) && lastDetectedSection !== section) {
      lastDetectedSection = section
      streamCallback({
        type: 'section_start',
        agent: 'PremiseArchitect',
        section,
      })
      break
    }
  }
}

/**
 * Extract a user-friendly message from raw content if parsing fails
 */
function extractMessageFromContent(content: string): string {
  // Try to find a "message" field
  const messageMatch = content.match(/"message"\s*:\s*"([^"]+)"/)
  if (messageMatch) {
    return messageMatch[1]
  }

  // Otherwise, return a truncated version of the raw content
  if (content.length > 500) {
    return content.substring(0, 500) + '...'
  }

  return content || 'World bible generated'
}

/**
 * Extract soundtrack data from conversational response
 * Handles cases where LLM doesn't follow JSON format but describes tracks in text
 */
function extractSoundtracksFromText(
  text: string
): { title: string; artist: string; youtubeUrl?: string; mood?: string }[] {
  const soundtracks: { title: string; artist: string; youtubeUrl?: string; mood?: string }[] = []
  let match

  // Pattern 1: **"Title" – Artist** format (with quotes around title)
  // Matches: - **"Goodbye" – Apparat feat. Soap&Skin**
  const pattern1 = /\*\*[""]([^""]+)[""][""']?\s*[–-]\s*([^*]+)\*\*/g
  while ((match = pattern1.exec(text)) !== null) {
    const title = match[1].trim()
    const artist = match[2].trim()
    if (title.length > 1 && artist.length > 1) {
      soundtracks.push({ title, artist })
    }
  }

  // Pattern 2: **Artist – Title** format (artist first)
  // Matches: 1. **Apparat – Goodbye (feat. Soap&Skin)**
  if (soundtracks.length === 0) {
    const pattern2 = /\*\*([^*""–-]+?)\s*[–-]\s*([^*]+?)\*\*/g
    while ((match = pattern2.exec(text)) !== null) {
      const artist = match[1].trim()
      const title = match[2].trim()
      if (artist.length > 1 && title.length > 1) {
        soundtracks.push({ title, artist })
      }
    }
  }

  // Pattern 3: "Artist – Title" without markdown (plain text)
  // Matches: Bohren & der Club of Gore – "Prowler"
  if (soundtracks.length === 0) {
    const pattern3 = /([A-Za-z][^–\-\n]+?)\s*[–-]\s*[""]([^""]+)[""]/g
    while ((match = pattern3.exec(text)) !== null) {
      const artist = match[1].trim()
      const title = match[2].trim()
      if (artist.length > 2 && title.length > 2 && !artist.toLowerCase().includes('for example')) {
        soundtracks.push({ title, artist })
      }
    }
  }

  // Pattern 4: Numbered/bullet lists like "1. Title by Artist" or "- Title – Artist"
  if (soundtracks.length === 0) {
    const pattern4 = /(?:\d+\.|-)\s*[""]?([^""*\n–-]+)[""]?\s*(?:by|–|-)\s*(.+?)(?:\n|$)/gi
    while ((match = pattern4.exec(text)) !== null) {
      const title = match[1].trim().replace(/\*+/g, '')
      const artist = match[2].trim().replace(/\*+/g, '').split('\n')[0].trim()
      if (title.length > 2 && artist.length > 2) {
        if (!soundtracks.some(s => s.title.toLowerCase() === title.toLowerCase())) {
          soundtracks.push({ title, artist })
        }
      }
    }
  }

  // Extract YouTube URLs if present
  const urlPattern =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/g
  const urls: string[] = []
  while ((match = urlPattern.exec(text)) !== null) {
    urls.push(`https://youtube.com/watch?v=${match[1]}`)
  }

  // Associate URLs with tracks if counts match
  if (urls.length > 0 && urls.length === soundtracks.length) {
    soundtracks.forEach((track, i) => {
      track.youtubeUrl = urls[i]
    })
  }

  return soundtracks
}

/**
 * Extract world rules from conversational response
 */
function extractWorldRulesFromText(
  text: string
): { category: string; rule: string; consequence: string }[] {
  const rules: { category: string; rule: string; consequence: string }[] = []

  // Pattern: Numbered list items with rule descriptions
  const pattern = /\d+\.\s*\*?\*?([^:\n]+?)(?::\s*|\*?\*?\s*[-–]\s*)(.+?)(?:\n|$)/gi
  let match
  while ((match = pattern.exec(text)) !== null) {
    const rulePart = match[1].trim().replace(/\*+/g, '')
    const description = match[2].trim().replace(/\*+/g, '')
    if (rulePart.length > 5 && description.length > 10) {
      rules.push({
        category: 'General',
        rule: rulePart,
        consequence: description.split('.')[0] + '.', // First sentence as consequence
      })
    }
  }

  return rules
}

/**
 * Extract factions from conversational response
 */
function extractFactionsFromText(
  text: string
): { id: string; name: string; ideology: string; goals: string[] }[] {
  const factions: { id: string; name: string; ideology: string; goals: string[] }[] = []

  // Pattern: "**Faction Name** - Description" or "1. Faction Name: Description"
  const pattern =
    /(?:\d+\.\s*)?\*?\*?([A-Z][^*:\n]+?)\*?\*?\s*(?:[-–:])\s*(.+?)(?=\n\d+\.|\n\*\*|\n\n|$)/gis
  let match
  let index = 0
  while ((match = pattern.exec(text)) !== null) {
    const name = match[1].trim().replace(/\*+/g, '')
    const description = match[2].trim().replace(/\*+/g, '')
    if (name.length > 2 && description.length > 10) {
      factions.push({
        id: `faction-${index++}`,
        name,
        ideology: description.split('.')[0] + '.',
        goals: [description],
      })
    }
  }

  return factions
}

/**
 * Extract key characters from conversational response
 */
function extractKeyCharactersFromText(
  text: string
): { name: string; role: string; archetype: string; motivation: string }[] {
  const characters: { name: string; role: string; archetype: string; motivation: string }[] = []

  // Pattern: "**Character Name** (Role) - Description"
  const pattern =
    /(?:\d+\.\s*)?\*?\*?([A-Z][^*()\n]+?)\*?\*?\s*(?:\(([^)]+)\))?\s*(?:[-–:])\s*(.+?)(?=\n\d+\.|\n\*\*|\n\n|$)/gis
  let match
  while ((match = pattern.exec(text)) !== null) {
    const name = match[1].trim().replace(/\*+/g, '')
    const role = match[2]?.trim() || 'Character'
    const description = match[3]?.trim().replace(/\*+/g, '') || ''
    if (name.length > 2 && description.length > 10) {
      characters.push({
        name,
        role,
        archetype: role,
        motivation: description.split('.')[0] + '.',
      })
    }
  }

  return characters
}

/**
 * Extract plot twists from conversational response
 */
function extractPlotTwistsFromText(text: string): string[] {
  const twists: string[] = []

  // Pattern: Numbered list items
  const pattern = /\d+\.\s*\*?\*?(.+?)(?:\*?\*?\s*(?:\n|$))/gi
  let match
  while ((match = pattern.exec(text)) !== null) {
    const twist = match[1].trim().replace(/\*+/g, '')
    if (twist.length > 15) {
      twists.push(twist)
    }
  }

  return twists
}

/**
 * Extract inspirations from conversational response
 */
function extractInspirationsFromText(text: string): {
  books: string[]
  movies: string[]
  games: string[]
} {
  const inspirations: { books: string[]; movies: string[]; games: string[] } = {
    books: [],
    movies: [],
    games: [],
  }

  // Find titles in quotes or with formatting
  const titlePattern = /[""]([^""]+)[""]/g
  const titles: string[] = []
  let match
  while ((match = titlePattern.exec(text)) !== null) {
    titles.push(match[1].trim())
  }

  // Try to categorize based on context
  const lowerText = text.toLowerCase()
  if (lowerText.includes('book') || lowerText.includes('novel') || lowerText.includes('read')) {
    inspirations.books = titles.slice(0, 3)
  } else if (
    lowerText.includes('film') ||
    lowerText.includes('movie') ||
    lowerText.includes('watch')
  ) {
    inspirations.movies = titles.slice(0, 3)
  } else if (lowerText.includes('game') || lowerText.includes('play')) {
    inspirations.games = titles.slice(0, 3)
  } else {
    // Default to movies
    inspirations.movies = titles.slice(0, 3)
  }

  return inspirations
}

// Reset section detection between calls
function resetSectionDetection() {
  lastDetectedSection = ''
}

// ============================================
// PROGRESSIVE BIBLE GENERATION
// ============================================

/**
 * Section definitions for progressive generation
 */
const PROGRESSIVE_SECTIONS = [
  {
    key: 'worldDescription',
    name: 'World Description',
    prompt: `Generate a vivid, atmospheric description of the world. Focus on:
- Visual style and aesthetic
- Sensory details (sights, sounds, smells)
- The general "feel" and atmosphere
- Key locations or regions (briefly)

Return ONLY valid JSON: { "worldDescription": "Your atmospheric description here" }`,
  },
  {
    key: 'worldRules',
    name: 'World Rules',
    prompt: `Define the hard rules that govern this world. Focus on:
- Physics/Magic system rules and their costs
- Technology constraints
- Societal laws and taboos
- What happens when rules are broken

⚠️ LIMIT: Maximum 6 rules. Pick the most impactful constraints that drive conflict.

Return ONLY valid JSON: { "worldRules": [{ "category": "Magic|Physics|Technology|Society", "rule": "The rule", "consequence": "What happens" }] }`,
  },
  {
    key: 'factions',
    name: 'Factions & Powers',
    prompt: `Create opposing factions with incompatible goals. Each faction needs:
- Unique ideology and goals
- Resources/strengths
- Weaknesses
- Rivals

Return ONLY valid JSON: { "factions": [{ "id": "f1", "name": "Name", "ideology": "Core belief", "goals": ["Goal"], "resources": "Power", "weaknesses": "Flaw", "rivals": ["Other faction"] }] }`,
  },
  {
    key: 'keyCharacters',
    name: 'Key Characters',
    prompt: `Define key characters with deep motivations:
- Protagonist (with flaw)
- Antagonist (sympathetic motivation)
- Key supporting characters

Return ONLY valid JSON: { "keyCharacters": [{ "name": "Name", "role": "Protagonist|Antagonist|Supporting", "archetype": "The archetype", "motivation": "What drives them", "factionId": "faction_id_or_null" }] }`,
  },
  {
    key: 'plotTwists',
    name: 'Plot Twists',
    prompt: `Create 3 major plot twists that will completely recontextualize the story.
Each twist should make the audience want to rewatch from the beginning.

Return ONLY valid JSON: { "plotTwists": ["Twist 1", "Twist 2", "Twist 3"] }`,
  },
  {
    key: 'episodeRoadmap',
    name: 'Season Roadmap',
    prompt: `You are an Elite TV Showrunner. Plan the Season Spine first, then break it down into episodes.

STEP 1: DEFINE THE SEASON SPINE
- Inciting Incident, Midpoint, Climax, Resolution.

STEP 2: EPISODE BREAKDOWN (8-10 Episodes)
For each episode:
- A-Plot (Main Arc) & B-Plot (Character Arc)
- Hook (Teaser) & Cliffhanger
- Showrunner Reasoning (Why this episode?)

Return ONLY valid JSON: { 
  "seasonStructure": { "seasonLogline": "...", "incitingIncident": "...", "midpointClimax": "...", "seasonClimax": "...", "resolution": "...", "themeExploration": "..." },
  "sequences": [{ "id": 1, "name": "Title", "logline": "...", "mainPlotBeat": "...", "bPlotBeat": "...", "hook": "...", "cliffhanger": "...", "reasoning": "...", "keyFactionsInvolved": [], "worldConsequence": "..." }] 
}`,
  },
  {
    key: 'metadata',
    name: 'Metadata',
    prompt: `Define the story's core metadata:
- Genre and tone
- Central thematic question
- Key themes (2-3)
- Inspirations (max 3 books, 3 movies, 3 games)

Return ONLY valid JSON: { "genre": "Genre", "tone": "Tone", "centralQuestion": "The big question", "themes": ["Theme1", "Theme2"], "inspirations": { "books": [], "movies": [], "games": [] } }`,
  },
]

/**
 * Generate bible sections progressively, streaming each section as it completes
 */
export async function generateBibleProgressively(
  model: any,
  baseContext: string,
  userRequest: string,
  streamCallback: StreamCallback,
  existingBible: any = {}
): Promise<any> {
  const generatedSections: Record<string, any> = {}

  for (const section of PROGRESSIVE_SECTIONS) {
    // Signal section start
    streamCallback({
      type: 'section_start',
      agent: 'PremiseArchitect',
      section: section.key,
    })

    // Build context including previously generated sections
    const contextParts = [
      baseContext,
      `\n## USER REQUEST\n${userRequest}`,
      '\n## PREVIOUSLY GENERATED SECTIONS',
    ]

    // Include already generated sections for context
    for (const [key, value] of Object.entries(generatedSections)) {
      contextParts.push(`${key}: ${JSON.stringify(value).substring(0, 500)}...`)
    }

    // Include existing bible sections for reference
    if (Object.keys(existingBible).length > 0) {
      contextParts.push('\n## EXISTING BIBLE (for reference)')
      contextParts.push(JSON.stringify(existingBible).substring(0, 1000) + '...')
    }

    contextParts.push(`\n## CURRENT TASK: Generate ${section.name}`)
    contextParts.push(section.prompt)

    const sectionPrompt = contextParts.join('\n')

    try {
      // Stream this section's generation
      let sectionContent = ''
      const sectionStream = await model.stream([new SystemMessage(sectionPrompt)])

      for await (const chunk of sectionStream) {
        const token = typeof chunk.content === 'string' ? chunk.content : ''
        if (token) {
          sectionContent += token
          streamCallback({
            type: 'token',
            agent: 'PremiseArchitect',
            token,
            section: section.key,
          })
        }
      }

      // Parse the section content
      try {
        // Try to extract JSON from content
        const jsonMatch = sectionContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          Object.assign(generatedSections, parsed)

          // Signal section complete with parsed content
          streamCallback({
            type: 'section_complete',
            agent: 'PremiseArchitect',
            section: section.key,
            content: parsed,
          })
        }
      } catch (parseError) {
        console.warn(`Failed to parse ${section.key} section:`, parseError)
        // Still signal completion even if parsing failed
        streamCallback({
          type: 'section_complete',
          agent: 'PremiseArchitect',
          section: section.key,
          content: { raw: sectionContent },
        })
      }
    } catch (sectionError) {
      console.error(`Error generating ${section.key}:`, sectionError)
      // Continue with next section
    }
  }

  return generatedSections
}

/**
 * Build a complete StoryPlan from progressively generated sections
 */
function buildStoryPlanFromSections(sections: Record<string, any>): any {
  return {
    title: sections.title || 'Untitled',
    worldDescription: sections.worldDescription || '',
    worldRules: sections.worldRules || [],
    factions: sections.factions || [],
    keyCharacters: sections.keyCharacters || [],
    plotTwists: sections.plotTwists || [],
    genre: sections.genre || 'Unknown',
    tone: sections.tone || 'Unknown',
    centralQuestion: sections.centralQuestion || '',
    themes: sections.themes || [],
    inspirations: sections.inspirations || { books: [], movies: [], games: [] },
    sequences: sections.sequences || [],
    seasonStructure: sections.seasonStructure || null,
    moodImages: [],
  }
}

const PREMISE_ARCHITECT_PROMPT = `
## YOU ARE THE WORLD & CONFLICT ARCHITECT

Your job is NOT to write a screenplay. Your job is to build a volatile ecosystem aka the "World Bible".
We follow the "Gardener" philosophy (George R.R. Martin, Vince Gilligan) mixed with the "Clockwork" logic (DARK by Netflix):
**"Create characters and a world so distinct that the story writes itself through their collisions. Everything is connected."**

## CORE PHILOSOPHY: THE WEB
1. **The Web of Connectivity (DARK style)**: No event is isolated. A decision made by a character in Episode 1 must ripple through to Episode 8. Secrets are the currency of this world. There are no coincidences, only inevitabilities.
2. **The Gardener (GRRM style)**: Don't force the plot. Plant the seeds (factions, flaws, rules) and let the conflict grow organically. If a character makes a mistake, they suffer. No plot armor.
3. **Atmosphere is Character**: The world itself should feel like an antagonist. Describe it with sensory precision—oppressive rains, glowing neon, decaying brutalism, ancient forests. The mood should be "Sexy, Dangerous, and Intellectual."

## STEP 1: THE RULES OF PLAY (World Building)
Define the hard constraints. Magic, physics, politics, technology.
Rules create conflict. "Time travel burns your soul" is better than "Time travel is fun".
The logic must be watertight. If X exists, what does that imply for Y?

## STEP 2: THE PLAYERS (Factions & Characters)
Create opposing forces. NOT just "Good vs Evil".
Create factions with incompatible goals and **hidden connections**.
- Faction A wants X.
- Faction B wants Y.
- They share a secret history or a common ancestor.
- The Protagonist is the knot in the rope that binds them.

## STEP 3: THE SPARK (Inciting Incident)
What disrupts the equilibrium? A body found where it shouldn't be? A signal from the void?
How do the factions react? The reaction must be disproportionate and revealing.

## STEP 4: PLOT TWISTS & ROADMAP
- **Plot Twists**: Provide exactly 3 major plot twists that recontextualize the story (e.g., "The villain is the hero's future self").
- **Episode Breakdown**: Define the arc of the season using "Therefore" and "But" logic. 
  - IF the number is known (or you decide to propose, e.g. 8-10), generate a 1-2 sentence summary for each episode in the \`sequences\` field.

## FULL BIBLE GENERATION
If the user asks for a "Whole Bible", "Full World", or "Create World", you MUST populate ALL fields in the \`storyPlan\` object.
Do not leave fields empty. Invent details if they are missing.
- worldDescription (Visuals, sensory details - THINK ATMOSPHERE)
- worldRules (Magic, technology, society - MAX 6 RULES - THINK CONSEQUENCES)
- factions (At least 2 conflicting factions with hidden ties)
- keyCharacters (Protagonist, Antagonist, Supporting - connected by secrets)
- plotTwists (3 major twists)
- sequences (Episode breakdown - assume 8-10 episodes)
- executiveSummary (2-3 sentence pitch for the entire season)
- tone, genre, themes, inspirations (max 3 books, 3 movies, 3 games)
- imagePrompts (Visual direction)

## YOUR RESPONSE FORMAT
Respond with a JSON object containing the complete story plan:

{
    "message": "Explain the core conflict, the web of secrets, and why this world is a powder keg.",
    "actions": [
        {
            "type": "UPDATE_SERIES_BIBLE",
            "payload": {
                "storyPlan": {
                    "title": "Working title",
                    "worldDescription": "A vivid, atmospheric description of the world. Sensory details. The look and feel. Think HBO/Netflix Premium.",
                    "inspirations": { // MAX 3 each: books, movies, games
                        "books": [
                            { "title": "Book Title", "description": "1-2 sentences about what this book is and why it's relevant." }
                        ],
                        "movies": [
                            { "title": "Movie Title", "description": "1-2 sentences about the film and its thematic connection." }
                        ],
                        "games": [
                            { "title": "Game Title", "description": "1-2 sentences about the game and what it shares with this world." }
                        ]
                    },
                    "moodSoundtrack": "Overall atmosphere description (legacy field)",
                    "soundtracks": [
                        { "title": "Song Title", "artist": "Artist Name", "youtubeUrl": "https://www.youtube.com/watch?v=REAL_VIDEO_ID", "mood": "dark, brooding" },
                        { "title": "Apparat - Goodbye", "artist": "Apparat", "youtubeUrl": "https://www.youtube.com/watch?v=REAL_VIDEO_ID", "mood": "melancholic, fateful" }
                    ],
                    "imagePrompts": {
                        "world": "A prompt describing a wide shot of the world setting. High fidelity, cinematic lighting, 8k.",
                        "scene1": "A prompt describing a key character moment or close-up detail.",
                        "scene2": "A prompt describing a faction conflict or dynamic action shot."
                    },
                    "genre": "Genre",
                    "tone": "Tone",
                    "centralQuestion": "Thematic question",
                    "worldRules": [ // MAX 6 rules - pick the most impactful
                        { "category": "Magic", "rule": "Magic consumes memories", "consequence": "Users eventually forget why they are fighting" }
                    ],
                    "plotTwists": [
                        "The protagonist is actually a ghost.",
                        "The Iron Bank is run by an AI.",
                        "The war ended 100 years ago, this is a simulation."
                    ],
                    "factions": [
                        { "id": "f1", "name": "The Iron Bank", "ideology": "Gold rules all", "goals": ["Control trade"], "resources": "Infinite wealth" }
                    ],
                    "keyCharacters": [
                         { "name": "Protagonist", "role": "Protagonist", "archetype": "The Reluctant King", "motivation": "Survival", "factionId": "f1" }
                    ],
                    "sequences": [
                        {
                            "id": 1,
                            "name": "The Inciting Incident",
                            "description": "The Spark that lights the fire.",
                            "keyFactionsInvolved": ["The Iron Bank"],
                            "worldConsequence": "War is declared."
                        },
                         {
                            "id": 2,
                            "name": "The Reaction",
                            "description": "How the factions move their pieces.",
                            "keyFactionsInvolved": ["The Iron Bank", "The Rebels"],
                            "worldConsequence": "Martial law is declared."
                        }
                    ],
                    "executiveSummary": "A 2-3 sentence pitch summarizing the entire season: the core conflict, the stakes, and what makes this story unique.",
                    "themes": ["Greed", "Memory", "Determinism"]
                }
            }
        }
    ],
    "confidence": 0.9
}

## CRITICAL REQUIREMENTS
1. **NO GENERIC TROPES** - Be weird. Be specific. Avoid "chosen ones" unless subverted.
2. **LOGIC IS KING (DARK Style)** - Construct complex causal chains. X happened because Y happened 20 years ago.
3. **THE WEB IS COMPLEX** - Create connections between seemingly unrelated things (families, factions, times).
4. **MORAL GREY** - No clear good guys. Everyone is the hero of their own story.
5. **ATMOSPHERE** - The setting is a character. Treat it with respect.
`

export const premiseArchitectAgent = async (
  state: WritersRoomState | WritersRoomStateWithStream
): Promise<Partial<WritersRoomState>> => {
  // Reset section detection for fresh tracking
  resetSectionDetection()

  // Create model inside function to use request-scoped config
  const model = getModel('premiseArchitect')

  // Check for streaming callback
  const streamCallback: StreamCallback | undefined = (state as WritersRoomStateWithStream)
    ._streamCallback

  // Build context from user input and any existing bible
  const existingBible = state.seriesBible || {}
  const storyPlan = existingBible.storyPlan || {}
  const masterPrompt = existingBible.masterPrompt || ''

  // Get the last user message to detect section-focused updates
  const conversationMessages = getSafeMessageHistory(state.messages, 5).filter(
    m => m._getType() !== 'system'
  )
  const lastUserMessage = conversationMessages
    .slice()
    .reverse()
    .find(m => m._getType() === 'human')
  const userInstruction =
    typeof lastUserMessage?.content === 'string' ? lastUserMessage.content : ''

  // Detect if this is a section-focused update
  const { section } = detectTargetSection(userInstruction)
  const isSectionUpdate = section !== 'full'

  console.log(
    `Premise Architect: ${isSectionUpdate ? `Section update [${section}]` : 'Full bible generation'}`
  )

  // Signal streaming start if callback provided
  if (streamCallback) {
    streamCallback({
      type: 'section_start',
      agent: 'PremiseArchitect',
      section: isSectionUpdate ? section : 'full_bible',
    })
  }

  // Build context based on update type
  let systemPrompt: string
  let contextMessage: string

  const promptId = SECTION_TO_PROMPT_ID[section]
  const loadedPrompt = await loadPromptCached(promptId)

  // Extract system template from ChatPromptTemplate
  // This is a bit of a hack since LangChain's ChatPromptTemplate isn't just a string
  const promptMessages =
    (loadedPrompt.prompt as any).promptMessages || (loadedPrompt.prompt as any).messages || []
  const systemMessage = promptMessages.find(
    (m: any) => m.lc_id?.[3] === 'SystemMessagePromptTemplate' || m._type === 'system'
  )
  const systemTemplate =
    systemMessage?.prompt?.template ||
    systemMessage?.template ||
    (isSectionUpdate ? SECTION_PROMPTS[section] : PREMISE_ARCHITECT_PROMPT)

  if (isSectionUpdate) {
    // Section-focused update - minimal context, focused prompt
    systemPrompt = systemTemplate

    // Include relevant existing content for context
    const sectionContext = buildSectionContext(section, existingBible, storyPlan)

    contextMessage = `
## EXISTING WORLD CONTEXT (For Reference)

**Title:** ${storyPlan.title || existingBible.title || 'Untitled'}
**Genre:** ${storyPlan.genre || existingBible.genre || 'Not defined'}
**Tone:** ${storyPlan.tone || existingBible.tone || 'Not defined'}

${sectionContext}

## USER'S REQUEST
${userInstruction}

    Generate the update for the ${section} section. Use smart merge to preserve existing content while incorporating changes.
`
  } else {
    // Full bible generation
    systemPrompt = systemTemplate

    contextMessage = `
## PROJECT CONTEXT

${masterPrompt ? `**Master Prompt (Project Style):**\n${masterPrompt}\n` : ''}

${existingBible.genre ? `**Established Genre:** ${existingBible.genre}` : ''}
${existingBible.tone ? `**Established Tone:** ${existingBible.tone}` : ''}
${existingBible.themes ? `**Established Themes:** ${existingBible.themes.join(', ')}` : ''}

## USER'S STORY IDEA
Based on the conversation, create the World Bible and Initial Conflict.
`
  }

  // Combine system content into single message (required for Claude)
  const combinedSystem = [systemPrompt, contextMessage].join('\n\n---\n\n')

  const messages = [new SystemMessage(combinedSystem), ...conversationMessages]

  // Check if progressive generation is requested
  const useProgressiveGeneration = (state as any)._useProgressiveGeneration === true

  try {
    // Try structured output first
    let parsed: PremiseArchitectResponse | null = null
    let actions: AgentAction[] = []

    // If streaming callback is provided AND we're doing full bible generation,
    // use streaming mode for better UX
    if (streamCallback && !isSectionUpdate) {
      if (useProgressiveGeneration) {
        // Use progressive section-by-section generation
        console.log('Premise Architect: Using progressive generation mode')
        const progressiveSections = await generateBibleProgressively(
          model,
          contextMessage,
          userInstruction,
          streamCallback,
          existingBible
        )

        // Build story plan from progressive sections
        const storyPlan = buildStoryPlanFromSections(progressiveSections)

        parsed = {
          message: 'World Bible generated progressively. Review each section above.',
          actions: [
            {
              type: 'UPDATE_SERIES_BIBLE',
              payload: { storyPlan },
            },
          ] as any,
          confidence: 0.8,
        }
        actions = parsed.actions as any
      } else {
        // Use standard streaming for full bible generation
        const streamResult = await streamPremiseGeneration(model, messages, streamCallback)
        parsed = streamResult.parsed
        actions = (parsed?.actions || []) as any
      }
    } else {
      // Use standard structured output for section updates
      try {
        const structuredModel = model.withStructuredOutput(PremiseArchitectResponseSchema)
        parsed = (await structuredModel.invoke(messages)) as PremiseArchitectResponse
        actions = (parsed.actions || []) as any
      } catch (structuredError) {
        console.warn(
          'Premise Architect: Structured output failed, falling back to manual parsing',
          structuredError
        )

        // Fallback to manual parsing
        // Use a fresh copy of messages for the fallback call, filtering out any orphan tool calls
        // or malformed history that might have caused the structured output to fail if it was an API error.
        const fallbackMessages = getSafeMessageHistory(state.messages, 5).filter(
          m => m._getType() !== 'system'
        )
        const response = await model.invoke([
          new SystemMessage(combinedSystem),
          ...fallbackMessages,
        ])
        const content =
          typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
        parsed = parseAgentResponse(content, PremiseArchitectResponseSchema)

        if (!parsed) {
          // Even if full schema parsing failed, try to extract any storyPlan-like content
          // This handles cases where LLM returns a valid storyPlan object but doesn't match the exact schema
          let extractedStoryPlan = null
          let extractedActions: AgentAction[] = []

          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              const rawParsed = JSON.parse(jsonMatch[0])

              // Extract actions array if present (for section updates like UPDATE_SOUNDTRACKS)
              if (rawParsed.actions && Array.isArray(rawParsed.actions)) {
                extractedActions = rawParsed.actions
                console.log(
                  'PremiseArchitect: Extracted actions from fallback:',
                  extractedActions.map(a => a.type)
                )
              }

              // Check for storyPlan at various locations the LLM might put it
              extractedStoryPlan =
                rawParsed.storyPlan ||
                rawParsed.payload?.storyPlan ||
                rawParsed.actions?.[0]?.payload?.storyPlan ||
                (rawParsed.worldDescription ? rawParsed : null) // The object itself might be a storyPlan
            }
          } catch (e) {
            console.warn('PremiseArchitect: Could not extract from fallback content:', e)
          }

          // ENHANCED FALLBACK: Extract data from conversational response for ALL section types
          // When LLM doesn't follow JSON format but provides content in text
          const messageText = extractMessageFromContent(content)

          if (isSectionUpdate) {
            switch (section) {
              case 'soundtracks': {
                const existingAction = extractedActions.find(a => a.type === 'UPDATE_SOUNDTRACKS')
                const hasValidPayload = existingAction?.payload?.soundtracks?.length > 0
                if (!hasValidPayload) {
                  const soundtracks = extractSoundtracksFromText(messageText)
                  if (soundtracks.length > 0) {
                    console.log(
                      `PremiseArchitect: Extracted ${soundtracks.length} soundtracks from text`
                    )
                    extractedActions = extractedActions.filter(a => a.type !== 'UPDATE_SOUNDTRACKS')
                    extractedActions.push({
                      type: 'UPDATE_SOUNDTRACKS',
                      payload: { soundtracks, mergeMode: 'replace' },
                    } as any)
                  }
                }
                break
              }
              case 'worldRules': {
                const existingAction = extractedActions.find(a => a.type === 'UPDATE_WORLD_RULES')
                const hasValidPayload = existingAction?.payload?.rules?.length > 0
                if (!hasValidPayload) {
                  const rules = extractWorldRulesFromText(messageText)
                  if (rules.length > 0) {
                    console.log(`PremiseArchitect: Extracted ${rules.length} world rules from text`)
                    extractedActions = extractedActions.filter(a => a.type !== 'UPDATE_WORLD_RULES')
                    extractedActions.push({
                      type: 'UPDATE_WORLD_RULES',
                      payload: { rules, mergeMode: 'smart' },
                    } as any)
                  }
                }
                break
              }
              case 'factions': {
                const existingAction = extractedActions.find(a => a.type === 'UPDATE_FACTIONS')
                const hasValidPayload = existingAction?.payload?.factions?.length > 0
                if (!hasValidPayload) {
                  const factions = extractFactionsFromText(messageText)
                  if (factions.length > 0) {
                    console.log(`PremiseArchitect: Extracted ${factions.length} factions from text`)
                    extractedActions = extractedActions.filter(a => a.type !== 'UPDATE_FACTIONS')
                    extractedActions.push({
                      type: 'UPDATE_FACTIONS',
                      payload: { factions, mergeMode: 'smart' },
                    } as any)
                  }
                }
                break
              }
              case 'keyCharacters': {
                const existingAction = extractedActions.find(
                  a => a.type === 'UPDATE_KEY_CHARACTERS'
                )
                const hasValidPayload = existingAction?.payload?.keyCharacters?.length > 0
                if (!hasValidPayload) {
                  const keyCharacters = extractKeyCharactersFromText(messageText)
                  if (keyCharacters.length > 0) {
                    console.log(
                      `PremiseArchitect: Extracted ${keyCharacters.length} key characters from text`
                    )
                    extractedActions = extractedActions.filter(
                      a => a.type !== 'UPDATE_KEY_CHARACTERS'
                    )
                    extractedActions.push({
                      type: 'UPDATE_KEY_CHARACTERS',
                      payload: { keyCharacters, mergeMode: 'smart' },
                    } as any)
                  }
                }
                break
              }
              case 'plotTwists': {
                const existingAction = extractedActions.find(a => a.type === 'UPDATE_PLOT_TWISTS')
                const hasValidPayload = existingAction?.payload?.plotTwists?.length > 0
                if (!hasValidPayload) {
                  const plotTwists = extractPlotTwistsFromText(messageText)
                  if (plotTwists.length > 0) {
                    console.log(
                      `PremiseArchitect: Extracted ${plotTwists.length} plot twists from text`
                    )
                    extractedActions = extractedActions.filter(a => a.type !== 'UPDATE_PLOT_TWISTS')
                    extractedActions.push({
                      type: 'UPDATE_PLOT_TWISTS',
                      payload: { plotTwists, mergeMode: 'replace' },
                    } as any)
                  }
                }
                break
              }
              case 'inspirations': {
                const existingAction = extractedActions.find(a => a.type === 'UPDATE_INSPIRATIONS')
                const hasValidPayload =
                  existingAction?.payload?.inspirations &&
                  (existingAction.payload.inspirations.books?.length > 0 ||
                    existingAction.payload.inspirations.movies?.length > 0 ||
                    existingAction.payload.inspirations.games?.length > 0)
                if (!hasValidPayload) {
                  const inspirations = extractInspirationsFromText(messageText)
                  if (
                    inspirations.books.length > 0 ||
                    inspirations.movies.length > 0 ||
                    inspirations.games.length > 0
                  ) {
                    console.log('PremiseArchitect: Extracted inspirations from text')
                    extractedActions = extractedActions.filter(
                      a => a.type !== 'UPDATE_INSPIRATIONS'
                    )
                    extractedActions.push({
                      type: 'UPDATE_INSPIRATIONS',
                      payload: { inspirations, mergeMode: 'replace' },
                    } as any)
                  }
                }
                break
              }
              case 'worldDescription': {
                const existingAction = extractedActions.find(
                  a => a.type === 'UPDATE_WORLD_DESCRIPTION'
                )
                const hasValidPayload = existingAction?.payload?.description?.length > 50
                if (!hasValidPayload && messageText.length > 100) {
                  console.log('PremiseArchitect: Using message as world description')
                  extractedActions = extractedActions.filter(
                    a => a.type !== 'UPDATE_WORLD_DESCRIPTION'
                  )
                  extractedActions.push({
                    type: 'UPDATE_WORLD_DESCRIPTION',
                    payload: { description: messageText },
                  } as any)
                }
                break
              }
            }
          }

          parsed = {
            message: extractMessageFromContent(content),
            actions: extractedActions,
            confidence: extractedActions.length > 0 ? 0.8 : 0.5,
            storyPlan: extractedStoryPlan,
          } as any
        }
        actions = (parsed.actions || []) as any
      }
    }

    // ADDITIONAL FALLBACK: If parsed but no actions, try to extract from message content
    // This handles cases where LLM returns valid response but no JSON actions
    if (isSectionUpdate && actions.length === 0 && parsed?.message) {
      console.log(
        `PremiseArchitect: No actions found, attempting text extraction for section: ${section}`
      )
      const messageText = parsed.message

      switch (section) {
        case 'soundtracks': {
          const soundtracks = extractSoundtracksFromText(messageText)
          if (soundtracks.length > 0) {
            console.log(
              `PremiseArchitect: Extracted ${soundtracks.length} soundtracks from message text`
            )
            actions.push({
              type: 'UPDATE_SOUNDTRACKS',
              payload: { soundtracks, mergeMode: 'replace' },
            } as any)
          }
          break
        }
        case 'worldRules': {
          const rules = extractWorldRulesFromText(messageText)
          if (rules.length > 0) {
            console.log(`PremiseArchitect: Extracted ${rules.length} world rules from message text`)
            actions.push({
              type: 'UPDATE_WORLD_RULES',
              payload: { rules, mergeMode: 'smart' },
            } as any)
          }
          break
        }
        case 'factions': {
          const factions = extractFactionsFromText(messageText)
          if (factions.length > 0) {
            console.log(`PremiseArchitect: Extracted ${factions.length} factions from message text`)
            actions.push({
              type: 'UPDATE_FACTIONS',
              payload: { factions, mergeMode: 'smart' },
            } as any)
          }
          break
        }
        case 'keyCharacters': {
          const chars = extractKeyCharactersFromText(messageText)
          if (chars.length > 0) {
            console.log(`PremiseArchitect: Extracted ${chars.length} characters from message text`)
            actions.push({
              type: 'UPDATE_KEY_CHARACTERS',
              payload: { keyCharacters: chars, mergeMode: 'smart' },
            } as any)
          }
          break
        }
        case 'plotTwists': {
          const twists = extractPlotTwistsFromText(messageText)
          if (twists.length > 0) {
            console.log(
              `PremiseArchitect: Extracted ${twists.length} plot twists from message text`
            )
            actions.push({
              type: 'UPDATE_PLOT_TWISTS',
              payload: { plotTwists: twists, mergeMode: 'smart' },
            } as any)
          }
          break
        }
        case 'inspirations': {
          const inspirations = extractInspirationsFromText(messageText)
          if (inspirations) {
            console.log('PremiseArchitect: Extracted inspirations from message text')
            actions.push({
              type: 'UPDATE_INSPIRATIONS',
              payload: { inspirations, mergeMode: 'smart' },
            } as any)
          }
          break
        }
      }
    }

    // Generate user-friendly message for section updates
    // NOTE: These are PROPOSALS awaiting approval, not completed actions
    let messageContent = parsed.message

    // If we have section-specific actions, generate a better proposal message
    if (actions.length > 0 && isSectionUpdate) {
      const actionType = actions[0]?.type
      const payload = actions[0]?.payload as any

      switch (actionType) {
        case 'UPDATE_SOUNDTRACKS':
          const soundtracks = payload?.soundtracks || []
          if (soundtracks.length > 0) {
            messageContent =
              `Here are ${soundtracks.length} soundtrack recommendations for your approval:\n\n` +
              soundtracks
                .map(
                  (s: any, i: number) =>
                    `${i + 1}. **"${s.title}"** – ${s.artist}\n   ${s.mood ? `_${s.mood}_` : ''}\n   ${s.youtubeUrl || ''}`
                )
                .join('\n\n')
          }
          break
        case 'UPDATE_WORLD_RULES':
          const rules = payload?.rules || []
          if (rules.length > 0) {
            messageContent =
              `Here are ${rules.length} world rules for your approval:\n\n` +
              rules
                .slice(0, 5)
                .map((r: any, i: number) => `${i + 1}. **[${r.category}]** ${r.rule}`)
                .join('\n')
          }
          break
        case 'UPDATE_FACTIONS':
          const factions = payload?.factions || []
          if (factions.length > 0) {
            messageContent =
              `Here are ${factions.length} factions for your approval:\n\n` +
              factions
                .slice(0, 5)
                .map((f: any, i: number) => `${i + 1}. **${f.name}** – "${f.ideology}"`)
                .join('\n')
          }
          break
        case 'UPDATE_INSPIRATIONS':
          messageContent = 'Here are updated reference materials for your approval.'
          break
        case 'UPDATE_WORLD_DESCRIPTION':
          messageContent = 'Here is an updated atmospheric description for your approval.'
          break
        case 'UPDATE_KEY_CHARACTERS':
          const chars = payload?.keyCharacters || []
          if (chars.length > 0) {
            messageContent =
              `Here are ${chars.length} key characters for your approval:\n\n` +
              chars
                .slice(0, 5)
                .map((c: any, i: number) => `${i + 1}. **${c.name}** (${c.role}) – ${c.archetype}`)
                .join('\n')
          }
          break
        case 'UPDATE_PLOT_TWISTS':
          const twists = payload?.plotTwists || []
          if (twists.length > 0) {
            messageContent = `Here are ${twists.length} plot twists for your approval.`
          }
          break
        case 'UPDATE_EPISODE_ROADMAP':
          messageContent = 'Here is an updated season structure and episode breakdown for your approval.'
          break
        default:
          // Keep the original message
          break
      }
    }

    const confidence = parsed.confidence ?? 0.8

    const namedMessage = new AIMessage({
      content: messageContent,
      name: 'PremiseArchitect',
    })

    // Attach actions for UI and execution
    console.log(
      `PremiseArchitect: Attaching ${actions.length} actions to message:`,
      actions.map(a => `${a.type} (payload: ${a.payload ? 'yes' : 'no'})`)
    )
    ;(namedMessage as any).actions = actions
    ;(namedMessage as any).confidence = confidence

    // Extract story plan from:
    // 1. Actions array (the proper structured output path)
    // 2. Top-level storyPlan field (common when LLM doesn't follow action structure)
    // 3. Synthesize action if storyPlan exists but actions is empty
    let storyPlan = null
    const bibleAction = actions.find(a => a.type === 'UPDATE_SERIES_BIBLE')
    if (bibleAction?.payload?.storyPlan) {
      storyPlan = bibleAction.payload.storyPlan
    } else if (parsed?.storyPlan) {
      // LLM returned storyPlan at top level but not as an action
      // This happens when structured output partially works
      storyPlan = parsed.storyPlan
      console.log(
        'PremiseArchitect: Found storyPlan at top level, synthesizing UPDATE_SERIES_BIBLE action'
      )

      // Synthesize the action so it gets persisted properly
      const synthesizedAction = {
        type: 'UPDATE_SERIES_BIBLE' as const,
        payload: { storyPlan },
      }
      actions = [synthesizedAction as any]
      // Also attach to message for downstream handlers
      ;(namedMessage as any).actions = actions
    }

    // SMART TERMINATION: Pause after generating premise for user review
    console.log('PremiseArchitect: World & Conflict generated - pausing for user review')

    return {
      messages: [namedMessage],
      seriesBible: storyPlan
        ? {
            ...state.seriesBible,
            storyPlan,
            genre: storyPlan.genre,
            tone: storyPlan.tone,
            themes: storyPlan.themes,
            // Store the new heavy objects in the bible for other agents to see
            worldRules: storyPlan.worldRules,
            factions: storyPlan.factions,
            keyCharacters: storyPlan.keyCharacters,
          }
        : state.seriesBible,
      awaitingUserInput: true, // Pause for user to review/approve premise
    }
  } catch (error) {
    console.error('Premise Architect error:', error)

    const errorMessage = new AIMessage({
      content: `⚠️ **Error generating story structure**: ${error instanceof Error ? error.message : 'Unknown error'}

Please describe your story idea and I'll create a World Bible for you.`,
      name: 'PremiseArchitect',
    })

    return {
      messages: [errorMessage],
    }
  }
}
