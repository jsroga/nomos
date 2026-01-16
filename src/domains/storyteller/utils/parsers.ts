import {
    SoundtrackTrack,
    WorldRule,
    Faction,
    KeyCharacter,
} from '../schemas/agent-schemas'

/**
 * Extract the main message from raw content
 */
export function extractMessageFromContent(content: string): string {
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
export function extractSoundtracksFromText(
    text: string
): SoundtrackTrack[] {
    const soundtracks: SoundtrackTrack[] = []
    let match

    // Pattern 1: **"Title" – Artist** format (with quotes around title)
    const pattern1 = /\*\*[""]([^""]+)[""][""']?\s*[–-]\s*([^*]+)\*\*/g
    while ((match = pattern1.exec(text)) !== null) {
        const title = match[1].trim()
        const artist = match[2].trim()
        if (title.length > 1 && artist.length > 1) {
            soundtracks.push({ title, artist, youtubeUrl: '' })
        }
    }

    // Pattern 2: **Artist – Title** format (artist first)
    if (soundtracks.length === 0) {
        const pattern2 = /\*\*([^*""–-]+?)\s*[–-]\s*([^*]+?)\*\*/g
        while ((match = pattern2.exec(text)) !== null) {
            const artist = match[1].trim()
            const title = match[2].trim()
            if (artist.length > 1 && title.length > 1) {
                soundtracks.push({ title, artist, youtubeUrl: '' })
            }
        }
    }

    // Pattern 3: "Artist – Title" without markdown (plain text)
    if (soundtracks.length === 0) {
        const pattern3 = /([A-Za-z][^–\-\n]+?)\s*[–-]\s*[""]([^""]+)[""]/g
        while ((match = pattern3.exec(text)) !== null) {
            const artist = match[1].trim()
            const title = match[2].trim()
            if (artist.length > 2 && title.length > 2 && !artist.toLowerCase().includes('for example')) {
                soundtracks.push({ title, artist, youtubeUrl: '' })
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
                    soundtracks.push({ title, artist, youtubeUrl: '' })
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
export function extractWorldRulesFromText(
    text: string
): WorldRule[] {
    const rules: WorldRule[] = []

    // Pattern: Numbered list items with rule descriptions
    const pattern = /\d+\.\s*\*?\*?([^:\n]+?)(?::\s*|\*?\*?\s*[-–]\s*)(.+?)(?:\n|$)/gi
    let match
    while ((match = pattern.exec(text)) !== null) {
        const rulePart = match[1].trim().replace(/\*+/g, '')
        const description = match[2].trim().replace(/\*+/g, '')
        if (rulePart.length > 5 && description.length > 10) {
            rules.push({
                category: 'Society',
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
export function extractFactionsFromText(
    text: string
): Faction[] {
    const factions: Faction[] = []

    // Pattern: "**Faction Name** - Description" or "1. Faction Name: Description"
    const pattern =
        /(?:\d+\.\s*)?\*?\*?([A-Z][^*:\n]+?)\*?\*?\s*(?:[-–:])\s*([\s\S]+?)(?=\n\d+\.|\n\*\*|\n\n|$)/gi
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
                resources: '',
            })
        }
    }

    return factions
}

/**
 * Extract key characters from conversational response
 */
export function extractKeyCharactersFromText(
    text: string
): KeyCharacter[] {
    const characters: KeyCharacter[] = []

    // Pattern: "**Character Name** (Role) - Description"
    const pattern =
        /(?:\d+\.\s*)?\*?\*?([A-Z][^*()\n]+?)\*?\*?\s*(?:\(([^)]+)\))?\s*(?:[-–:])\s*([\s\S]+?)(?=\n\d+\.|\n\*\*|\n\n|$)/gi
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
                factionId: null,
            })
        }
    }

    return characters
}

/**
 * Extract plot twists from conversational response
 */
export function extractPlotTwistsFromText(text: string): string[] {
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
export function extractInspirationsFromText(text: string): {
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
