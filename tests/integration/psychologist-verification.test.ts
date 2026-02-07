
import { createPsychologistAgent } from '../../src/domains/storyteller/agents/v2/psychologist-agent'
import * as dotenv from 'dotenv'

dotenv.config()

/**
 * Integration Test for Psychologist Agent V2
 * 
 * Verifies that the agent can:
 * 1. Initialize correctly
 * 2. Analyze a character profile
 * 3. Simulate a reaction
 */
describe('Psychologist Agent V2', () => {
    // Increase timeout for LLM calls to 60s
    const timeout = 60000

    it('should analyze a character profile', async () => {
        const agent = await createPsychologistAgent()

        const description = "Walter White is a chemistry teacher diagnosed with lung cancer who turns to cooking meth to secure his family's future. He is proud, repressed, and increasingly ruthless."

        console.log('--- Analyzing Profile ---')
        const result = await agent.analyzeProfile('Walter White', description)

        console.log('Result:', result)

        expect(result).toBeDefined()
        expect(result.length).toBeGreaterThan(100)
        // Check for Big 5 keywords
        expect(result.toLowerCase()).toMatch(/openness|conscientiousness|extraversion|agreeableness|neuroticism/i)
    }, timeout)

    it('should simulate a reaction', async () => {
        const agent = await createPsychologistAgent()

        const character = "Jesse Pinkman"
        const event = "Walter tells Jesse he watched Jane die and did nothing."
        const context = "Jesse looked up to Walter as a father figure but has been betrayed by him constantly. Jane was the love of his life."

        console.log('--- Simulating Reaction ---')
        const result = await agent.simulateReaction(character, event, context)

        console.log('Result:', result)

        expect(result).toBeDefined()
        expect(result.length).toBeGreaterThan(50)
    }, timeout)
})
