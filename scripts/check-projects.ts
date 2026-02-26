
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Manual env parsing since dotenv might fail on 'export' prefix
const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env: Record<string, string> = {}
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*)$/)
    if (match) {
        let value = match[2].trim()
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
        if (value.startsWith('\'') && value.endsWith('\'')) value = value.slice(1, -1)
        env[match[1]] = value
    }
})

async function checkProjects() {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials in .env.local')
        console.log('Available keys:', Object.keys(env))
        return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check specific project ID from config
    const testId = '0696e553-d361-4a36-a839-fb9c5e570e75'
    const { data: testProj, error: testError } = await supabase.from('projects').select('id, name').eq('id', testId).single()

    if (testError) {
        console.log(`❌ Project ${testId} not found. Error:`, testError.message)
    } else {
        console.log(`✅ Project ${testId} exists:`, testProj.name)
    }

    // List recent projects
    const { data, error } = await supabase.from('projects').select('id, name').limit(5)

    if (error) {
        console.error('Error fetching projects:', error)
    } else {
        console.log('Recent Projects:', data)
    }
}

checkProjects()
