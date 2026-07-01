import { expect, test, describe } from 'vitest'
import { bibleToPrompt, SeriesBible } from '@/domains/storyteller/services/context/SeriesBible'

describe('bibleToPrompt', () => {
    test('includes cast in prompt output', () => {
        const mockBible: SeriesBible = {
            title: 'Test Series',
            logline: 'A test logline',
            premise: 'A test premise',
            genre: ['Sci-Fi'],
            tone: ['Dark'],
            centralTheme: 'Survival',
            thematicQuestion: 'Can we survive?',
            thematicElements: [],
            setting: { time: 'Future', place: 'Space', socialContext: 'War' },
            worldRules: [],
            characterArcs: [],
            toneGuidelines: { violence: '', humor: '', romance: '', dialogue: '' },
            visualMotifs: [],
            colorPalette: [],
            cinematicInfluences: [],
            worldDescription: 'A dark world.',
            inspirations: { books: [], movies: [], games: [] },
            moodSoundtrack: '',
            moodImages: [],
        }

        const cast = [
            { name: 'Alice', role: 'Protagonist', description: 'Hero of the story' },
            { name: 'Bob', role: 'Antagonist', description: 'Villain of the story' }
        ]

        const prompt = bibleToPrompt(mockBible, cast)

        expect(prompt).toContain('=== STORY BIBLE: Test Series ===')
        expect(prompt).toContain('--- CAST ---')
        expect(prompt).toContain('- Alice (Protagonist): Hero of the story')
        expect(prompt).toContain('- Bob (Antagonist): Villain of the story')
    })

    test('omits cast section when empty or undefined', () => {
        const mockBible = { title: 'Test' } as any

        const prompt1 = bibleToPrompt(mockBible, [])
        expect(prompt1).not.toContain('--- CAST ---')

        const prompt2 = bibleToPrompt(mockBible, undefined)
        expect(prompt2).not.toContain('--- CAST ---')
    })
})
