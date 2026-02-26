import { execSync } from 'child_process'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

const ENV_FILE = '.env.local'

function uploadEnv() {
    const envPath = path.resolve(process.cwd(), ENV_FILE)

    if (!fs.existsSync(envPath)) {
        console.error(`Error: ${ENV_FILE} not found.`)
        process.exit(1)
    }

    const envConfig = dotenv.parse(fs.readFileSync(envPath))
    const targets = ['production', 'preview', 'development']

    console.log(`🚀 Uploading ${Object.keys(envConfig).length} variables to Vercel [${targets.join(', ')}]...`)

    for (const [key, value] of Object.entries(envConfig)) {
        // Skip empty values or comments
        if (!value) continue

        console.log(`\nProcessing ${key}...`)

        for (const target of targets) {
            try {
                // Remove existing variable to avoid conflicts (optional, but cleaner for overwrite)
                // Ignoring errors here in case it doesn't exist
                try {
                    execSync(`npx vercel env rm ${key} ${target} -y`, { stdio: 'ignore' })
                } catch (e) {
                    // Ignore removal errors (likely doesn't exist)
                }

                // Add new variable
                // vercel env add <name> [environment] 
                // We pipe the value to stdin
                execSync(`printf "%s" "${value}" | npx vercel env add ${key} ${target}`, { stdio: 'inherit' })

            } catch (error) {
                console.error(`Failed to upload ${key} to ${target}:`, error)
            }
        }
    }

    console.log('\n✅ Upload complete!')
}

uploadEnv()
