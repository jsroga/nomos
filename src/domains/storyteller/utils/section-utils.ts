import { BibleSection, SectionDetection } from '../prompts/section-prompts'
import { StoryPlan, WorldRule, Faction, KeyCharacter, StorySequence, SoundtrackTrack } from '../schemas/agent-schemas'

let lastDetectedSection = ''

/**
 * Detect which bible section the user wants to update based on their message
 */
export function detectTargetSection(userMessage: string): SectionDetection {
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

/**
 * Reset section detection between calls
 */
export function resetSectionDetection() {
    lastDetectedSection = ''
}

/**
 * Build context string for a specific section based on existing bible data
 */
export function buildSectionContext(
    section: BibleSection,
    bible: Partial<StoryPlan>,
    storyPlan: Partial<StoryPlan>
): string {
    if (section === 'full') return ''

    const parts: string[] = [`## ${section.toUpperCase()} CONTEXT`]

    switch (section) {
        case 'worldDescription':
            const desc = storyPlan.worldDescription || bible.worldDescription
            if (desc) {
                parts.push('\n**Existing World Description:**')
                parts.push(desc)
            }
            break

        case 'worldRules':
            const rules = storyPlan.worldRules || bible.worldRules || []
            if (rules.length > 0) {
                parts.push('\n**Existing World Rules:**')
                rules.forEach((r: WorldRule, i: number) => {
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
                factions.forEach((f: Faction) =>
                    parts.push(`- ${f.name}: ${f.ideology} (Goals: ${f.goals.join(', ')})`)
                )
            }
            break

        case 'inspirations':
            const ins = storyPlan.inspirations || bible.inspirations
            if (ins) {
                parts.push('\n**Existing Inspirations:**')
                if (ins.books?.length > 0)
                    parts.push(`- Books: ${ins.books.map((b: any) => (typeof b === 'string' ? b : b.title || 'Untitled')).join(', ')}`)
                if (ins.movies?.length > 0)
                    parts.push(`- Movies: ${ins.movies.map((m: any) => (typeof m === 'string' ? m : m.title || 'Untitled')).join(', ')}`)
                if (ins.games?.length > 0)
                    parts.push(`- Games: ${ins.games.map((g: any) => (typeof g === 'string' ? g : g.title || 'Untitled')).join(', ')}`)
            }
            break

        case 'episodeRoadmap':
            const seqs = storyPlan.sequences || bible.sequences || []
            if (seqs.length > 0) {
                parts.push('\n**Existing Episode Roadmap:**')
                seqs.forEach((s: StorySequence) =>
                    parts.push(`- Ep ${s.id}: ${s.name} - ${s.logline || s.description}`)
                )
            }
            break

        case 'keyCharacters':
            const chars = storyPlan.keyCharacters || bible.keyCharacters || []
            if (chars.length > 0) {
                parts.push('\n**Existing Key Characters:**')
                chars.forEach((c: KeyCharacter) =>
                    parts.push(`- ${c.name} (${c.role}): ${c.archetype} - ${c.motivation}`)
                )
            }
            break

        case 'soundtracks':
            const existingSoundtracks = storyPlan.soundtracks || []
            if (existingSoundtracks.length > 0) {
                parts.push('\n**⚠️ EXISTING SOUNDTRACKS (DO NOT SUGGEST THESE AGAIN):**')
                existingSoundtracks.forEach((s: SoundtrackTrack) => parts.push(`- "${s.title}" by ${s.artist}`))
                parts.push('\n**You MUST suggest DIFFERENT tracks from the ones listed above.**')
            }
            break
    }

    return parts.join('\n')
}
