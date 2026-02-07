
import { describe, it, expect } from 'vitest'
import { createStorytellerAgent } from '../../src/domains/storyteller/agents/v2'

describe('Storyteller Streaming Compatibility', () => {
    it('should return a stream result compatible with AI SDK v4 (streamLegacy)', async () => {
        const agent = await createStorytellerAgent()

        try {
            const result = await agent.stream('Write a short sentence about a cat.')
            console.log('Stream Result Keys:', Object.keys(result))
            console.log('Stream Result:', result)

            // If it's MastraModelOutput, check where the stream is
            // expected(result).toHaveProperty('toDataStreamResponse')

            const response = result.toDataStreamResponse()
            const reader = response.body?.getReader()

            if (!reader) throw new Error('No reader')

            const decoder = new TextDecoder()
            console.log('Reading stream...')
            while (true) {
                const { value, done } = await reader.read()
                if (done) break
                const decoded = decoder.decode(value)
                console.log('Chunk:', decoded)
                // Check for protocol format (e.g., 0:"text")
                if (decoded.trim()) {
                    expect(decoded).toMatch(/^[0-9a-z]:/)
                }
            }
            console.log('Stream finished')

        } catch (error: any) {
            console.error('Test error:', error)
            throw error
        }
    })
})
