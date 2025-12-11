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
  | 'keyCharacters'
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
  if (msg.includes('world description') || msg.includes('world bible') || 
      (msg.includes('description') && msg.includes('world'))) {
    return { section: 'worldDescription', instruction: userMessage }
  }
  
  // World Rules / Laws
  if (msg.includes('world rules') || msg.includes('laws of') || 
      msg.includes('rules') || msg.includes('magic system') ||
      msg.includes('laws of the world')) {
    return { section: 'worldRules', instruction: userMessage }
  }
  
  // Factions
  if (msg.includes('faction') || msg.includes('power') || 
      msg.includes('groups') || msg.includes('organizations')) {
    return { section: 'factions', instruction: userMessage }
  }
  
  // Inspirations
  if (msg.includes('inspiration') || msg.includes('reference') ||
      msg.includes('books') || msg.includes('movies') || msg.includes('games')) {
    return { section: 'inspirations', instruction: userMessage }
  }
  
  // Plot Twists
  if (msg.includes('plot twist') || msg.includes('twist') || msg.includes('surprise')) {
    return { section: 'plotTwists', instruction: userMessage }
  }
  
  // Episode Roadmap
  if (msg.includes('episode') || msg.includes('roadmap') || 
      msg.includes('season') || msg.includes('arc breakdown')) {
    return { section: 'episodeRoadmap', instruction: userMessage }
  }
  
  // Key Characters
  if (msg.includes('character') || msg.includes('key player') || 
      msg.includes('protagonist') || msg.includes('antagonist')) {
    return { section: 'keyCharacters', instruction: userMessage }
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
Suggest books, movies, and games that match the world's tone and genre.

Use mergeMode "merge" to add to existing inspirations.

Respond with:
{
  "message": "Brief explanation of inspirations added",
  "actions": [{
    "type": "UPDATE_INSPIRATIONS",
    "payload": {
      "inspirations": { "books": ["Book 1"], "movies": ["Movie 1"], "games": ["Game 1"] },
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
## SECTION UPDATE: EPISODE ROADMAP

You are creating/updating the episode breakdown.
Define the arc of the season with 8-10 episodes.

Respond with:
{
  "message": "Brief explanation of the roadmap",
  "actions": [{
    "type": "UPDATE_EPISODE_ROADMAP",
    "payload": {
      "sequences": [
        { "id": 1, "name": "Episode Title", "description": "1-2 sentences", "keyFactionsInvolved": ["Faction"], "worldConsequence": "What changes" }
      ],
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

  full: '' // Uses the standard PREMISE_ARCHITECT_PROMPT
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
        parts.push(`\n**Existing World Rules:**`)
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
        parts.push(`\n**Existing Factions:**`)
        factions.forEach((f: any) => {
          parts.push(`- ${f.name}: "${f.ideology}" - Goals: ${f.goals?.join(', ')}`)
        })
      }
      break
      
    case 'inspirations':
      const insp = storyPlan.inspirations || bible.inspirations
      if (insp) {
        parts.push(`\n**Existing Inspirations:**`)
        if (insp.books?.length) parts.push(`- Books: ${insp.books.join(', ')}`)
        if (insp.movies?.length) parts.push(`- Movies: ${insp.movies.join(', ')}`)
        if (insp.games?.length) parts.push(`- Games: ${insp.games.join(', ')}`)
      }
      break
      
    case 'plotTwists':
      const twists = storyPlan.plotTwists || []
      if (twists.length > 0) {
        parts.push(`\n**Existing Plot Twists:**`)
        twists.forEach((t: string, i: number) => parts.push(`${i + 1}. ${t}`))
      }
      break
      
    case 'episodeRoadmap':
      const seqs = storyPlan.sequences || []
      if (seqs.length > 0) {
        parts.push(`\n**Existing Episode Roadmap:**`)
        seqs.forEach((s: any) => parts.push(`- Ep ${s.id}: ${s.name} - ${s.description}`))
      }
      break
      
    case 'keyCharacters':
      const chars = storyPlan.keyCharacters || bible.keyCharacters || []
      if (chars.length > 0) {
        parts.push(`\n**Existing Key Characters:**`)
        chars.forEach((c: any) => parts.push(`- ${c.name} (${c.role}): ${c.archetype} - ${c.motivation}`))
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
  const messageMatch = content.match(/"message"\s*:\s*"([^"]+)"/s)
  if (messageMatch) {
    return messageMatch[1]
  }
  
  // Otherwise, return a truncated version of the raw content
  if (content.length > 500) {
    return content.substring(0, 500) + '...'
  }
  
  return content || 'World bible generated'
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
    key: 'metadata',
    name: 'Metadata',
    prompt: `Define the story's core metadata:
- Genre and tone
- Central thematic question
- Key themes (2-3)
- Inspirations (books, movies, games)

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
      const sectionStream = await model.stream([
        new SystemMessage(sectionPrompt),
      ])
      
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
    moodImages: [],
  }
}

const PREMISE_ARCHITECT_PROMPT = `
## YOU ARE THE WORLD & CONFLICT ARCHITECT

Your job is NOT to write a screenplay. Your job is to build a volatile ecosystem aka the "World Bible".
We follow the "Gardener" philosophy (George R.R. Martin, Vince Gilligan):
**"Create characters and a world so distinct that the story writes itself through their collisions."**

## STEP 1: THE RULES OF PLAY (World Building)
Define the hard constraints. Magic, physics, politics, technology.
Rules create conflict. "Magic has a terrible cost" is better than "Magic can do anything".

## STEP 2: THE PLAYERS (Factions & Characters)
Create opposing forces. NOT just "Good vs Evil".
Create factions with incompatible goals.
- Faction A wants X.
- Faction B wants Y.
- X and Y cannot coexist.
- The Protagonist is caught in the middle.

## STEP 3: THE SPARK (Inciting Incident)
What disrupts the equilibrium? A death? An invention? A betrayal?
How do the factions react?

## STEP 4: PLOT TWISTS & ROADMAP
- **Plot Twists**: Provide exactly 3 major plot twists that completely recontextualize the story.
- **Episode Breakdown**: Define the arc of the season. 
  - IF the number is known (or you decide to propose, e.g. 8-10), generate a 1-2 sentence summary for each episode in the \`sequences\` field.

## FULL BIBLE GENERATION
If the user asks for a "Whole Bible", "Full World", or "Create World", you MUST populate ALL fields in the \`storyPlan\` object.
Do not leave fields empty. Invent details if they are missing.
- worldDescription (Visuals, sensory details)
- worldRules (Magic, technology, society)
- factions (At least 2 conflicting factions)
- keyCharacters (Protagonist, Antagonist, Supporting)
- plotTwists (3 major twists)
- sequences (Episode breakdown - assume 8-10 episodes if not specified)
- tone, genre, themes, inspirations

## YOUR RESPONSE FORMAT
Respond with a JSON object containing the complete story plan:

{
    "message": "Explain the core conflict and why this world is a powder keg.",
    "actions": [
        {
            "type": "UPDATE_SERIES_BIBLE",
            "payload": {
                "storyPlan": {
                    "title": "Working title",
                    "worldDescription": "A vivid, atmospheric description of the world. Sensory details. The look and feel.",
                    "inspirations": {
                        "books": ["Book 1", "Book 2"],
                        "movies": ["Movie 1"],
                        "games": ["Game 1"]
                    },
                    "moodSoundtrack": "Link to a song or description of the musical vibe (e.g. 'Industrial synthwave mixed with gregorian chants')",
                    "imagePrompts": {
                        "world": "A prompt describing a wide shot of the world setting. High fidelity, cinematic lighting, 8k.",
                        "scene1": "A prompt describing a key character moment or close-up detail.",
                        "scene2": "A prompt describing a faction conflict or dynamic action shot."
                    },
                    "genre": "Genre",
                    "tone": "Tone",
                    "centralQuestion": "Thematic question",
                    "worldRules": [
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
                    "themes": ["Greed", "Memory"]
                }
            }
        }
    ],
    "confidence": 0.9
}

## CRITICAL REQUIREMENTS
1. **NO GENERIC TROPES** - Be weird. Be specific.
2. **LOGIC IS KING** - People act in their self-interest.
3. **CONSEQUENCES** - Every action by a faction must have a reaction.
4. **MORAL GREY** - No clear good guys. Everyone is the hero of their own story.
`

export const premiseArchitectAgent = async (
  state: WritersRoomState | WritersRoomStateWithStream
): Promise<Partial<WritersRoomState>> => {
  // Reset section detection for fresh tracking
  resetSectionDetection()
  
  // Create model inside function to use request-scoped config
  const model = getModel('premiseArchitect')
  
  // Check for streaming callback
  const streamCallback: StreamCallback | undefined = (state as WritersRoomStateWithStream)._streamCallback
  
  // Build context from user input and any existing bible
  const existingBible = state.seriesBible || {}
  const storyPlan = existingBible.storyPlan || {}
  const masterPrompt = existingBible.masterPrompt || ''

  // Get the last user message to detect section-focused updates
  const conversationMessages = getSafeMessageHistory(state.messages, 5).filter(m => m._getType() !== 'system')
  const lastUserMessage = conversationMessages.slice().reverse().find(m => m._getType() === 'human')
  const userInstruction = typeof lastUserMessage?.content === 'string' 
    ? lastUserMessage.content 
    : ''
  
  // Detect if this is a section-focused update
  const { section } = detectTargetSection(userInstruction)
  const isSectionUpdate = section !== 'full'
  
  console.log(`Premise Architect: ${isSectionUpdate ? `Section update [${section}]` : 'Full bible generation'}`)

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

  if (isSectionUpdate) {
    // Section-focused update - minimal context, focused prompt
    systemPrompt = SECTION_PROMPTS[section]
    
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
    systemPrompt = PREMISE_ARCHITECT_PROMPT
    
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
  
  const messages = [
    new SystemMessage(combinedSystem),
    ...conversationMessages,
  ]

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
          actions: [{
            type: 'UPDATE_SERIES_BIBLE',
            payload: { storyPlan }
          }] as any,
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
        const fallbackMessages = getSafeMessageHistory(state.messages, 5).filter(m => m._getType() !== 'system')
        const response = await model.invoke([
          new SystemMessage(combinedSystem),
          ...fallbackMessages
        ])
        const content =
          typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
        parsed = parseAgentResponse(content, PremiseArchitectResponseSchema)

        if (!parsed) {
          parsed = {
            message: content,
            actions: [],
            confidence: 0.5,
          }
        }
        actions = (parsed.actions || []) as any
      }
    }

    const messageContent = parsed.message
    const confidence = parsed.confidence ?? 0.8

    const namedMessage = new AIMessage({
      content: messageContent,
      name: 'PremiseArchitect',
    })

      // Attach actions for UI and execution
      ; (namedMessage as any).actions = actions
      ; (namedMessage as any).confidence = confidence

    // Extract story plan from actions if present
    let storyPlan = null
    const bibleAction = actions.find(a => a.type === 'UPDATE_SERIES_BIBLE')
    if (bibleAction?.payload?.storyPlan) {
      storyPlan = bibleAction.payload.storyPlan
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
          keyCharacters: storyPlan.keyCharacters
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

