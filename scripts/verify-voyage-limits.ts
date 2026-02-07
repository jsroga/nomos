
import { getVoyageEmbeddings } from '../src/infrastructure/ai/embeddings/voyage-embeddings'
import { config } from 'dotenv'

config({ path: '.env.local' })

async function testVoyageLimits() {
    const voyage = getVoyageEmbeddings()
    console.log('🚀 Starting Voyage API Stress Test...')

    const texts = Array(10).fill('The quick brown fox jumps over the lazy dog.').map((t, i) => `${t} ${i}`)

    try {
        const promises = texts.map((text, i) => {
            console.log(`Sending request ${i + 1}...`)
            return voyage.embedQuery(text)
        })

        const results = await Promise.all(promises)
        console.log(`✅ Successfully embedded ${results.length} texts concurrently.`)
        console.log('Sample vector length:', results[0].length)

    } catch (error) {
        console.error('❌ Test failed:', error)
    }
}

testVoyageLimits()
