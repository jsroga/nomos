import OpenAI from 'openai'
import * as dotenv from 'dotenv'
import * as path from 'path'

async function test() {
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
    console.log('Key:', process.env.OPENAI_API_KEY?.substring(0, 15) + '...')

    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

    try {
        const res = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Hello, are you there?' }],
            temperature: 0,
        })
        console.log('Success:', res.choices[0].message.content)
    } catch (e: any) {
        console.error('Failed:', e.message || e)
    }
}

test()
