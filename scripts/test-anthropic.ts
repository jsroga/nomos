import { ChatAnthropic } from '@langchain/anthropic'
import * as dotenv from 'dotenv'
import * as path from 'path'

async function test() {
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
    console.log('Key:', process.env.ANTHROPIC_API_KEY?.substring(0, 15) + '...')

    const model = new ChatAnthropic({
        modelName: 'claude-3-haiku-20240307',
        temperature: 0,
    })

    try {
        const res = await model.invoke('Hello, are you there?')
        console.log('Success:', res.content)
    } catch (e) {
        console.error('Failed:', e)
    }
}

test()
