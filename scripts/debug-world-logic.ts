
import { StorytellerAgent } from '@/domains/storyteller/agents/StorytellerAgent'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
    console.log('🚀 Starting reproduction script...')
    try {
        const agent = await StorytellerAgent.create('openai:gpt-4o')
        console.log('✅ Agent created.')

        const prompt = 'Create a rule for this world: \'Gravity fluctuates every hour\'. Make sure to save it to the world bible.'
        console.log('📤 Streaming with prompt:', prompt)

        const stream = await agent.stream(prompt, {
            projectId: 'debug-proj-123',
            threadId: 'debug-thread',
            traceId: 'debug-trace-id' // hex id check might warn
        })

        console.log('✅ Stream started.')
        const streamAny = stream as any
        console.log('Stream keys:', Object.keys(streamAny))

        if (streamAny.fullStream) {
            console.log('Has fullStream property')
            for await (const chunk of streamAny.fullStream) {
                if (chunk.type === 'text-delta') process.stdout.write(chunk.textDelta)
            }
        } else if (streamAny.textStream) {
            console.log('Has textStream property')
            for await (const chunk of streamAny.textStream) {
                process.stdout.write(chunk)
            }
        } else {
            console.log('Unknown structure:', stream)
            // Try iterating directly
            try {
                for await (const chunk of streamAny) {
                    console.log('Chunk:', chunk)
                }
            } catch (e) {
                console.log('Not async iterable')
            }
        }

        console.log('\n✅ Stream finished successfully.')

    } catch (e: any) {
        console.error('\n❌ CRASHED:', e)
        console.error(e.stack)
    }
}

main()
