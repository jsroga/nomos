import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { SystemMessage } from '@langchain/core/messages'
import { StoryPlan } from '../schemas/agent-schemas'
import { StreamCallback } from '../guardrails/types'

/**
 * Section definitions for progressive generation
 */
export const PROGRESSIVE_SECTIONS = [
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
    model: BaseChatModel,
    baseContext: string,
    userRequest: string,
    streamCallback: StreamCallback,
    existingBible: Partial<StoryPlan> = {}
): Promise<Partial<StoryPlan>> {
    const generatedSections: Partial<StoryPlan> = {}

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
export function buildStoryPlanFromSections(sections: Partial<StoryPlan>): StoryPlan {
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
