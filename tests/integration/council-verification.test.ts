
import { describe, it, expect } from 'vitest'
import { createStorytellerAgent } from '../../src/domains/storyteller/agents/v2/storyteller-agent'

/**
 * Council Integration Test
 * 
 * Verifies that the Storyteller Agent can CONSULT the new specialized agents
 * via the "meta-tools" provided.
 */
describe('Council Integration (V2)', () => {
    // Increase timeout for multi-agent chains
    const timeout = 120000

    it('should consult the Psychologist', async () => {
        const agent = await createStorytellerAgent()

        const prompt = `Analyze the psychology of a character named "Arthur Dent". 
        He is an ordinary man who was displaced from his home.
        Use the Psychologist tool.`

        console.log('--- Consulting Psychologist ---')
        const response = await agent.run('Analyze Arthur Dent', prompt)
        console.log('Response:', response)

        expect(response).toBeDefined()
        // We expect some psychological depth or mention of character traits
        expect(response.length).toBeGreaterThan(100)
    }, timeout)

    it('should consult the Devil\'s Advocate', async () => {
        const agent = await createStorytellerAgent()

        const prompt = `Critique this scene idea: "A dark and stormy night, the detective walks in and finds the body."
        Use the Devil's Advocate to tell me if it's a cliché.`

        console.log('--- Consulting Devil\'s Advocate ---')
        const response = await agent.run('Critique Cliché', prompt)
        console.log('Response:', response)

        expect(response).toBeDefined()
        expect(response.toLowerCase()).toContain('cliché')
    }, timeout)
})
