import { defineConfig } from '@trigger.dev/sdk/v3'
import { syncEnvVars } from '@trigger.dev/build/extensions/core'
import { config } from 'dotenv'

export default defineConfig({
  project: 'proj_wkorovfruzqhizygormk', // world-building-kit project
  runtime: 'node',
  logLevel: 'log',
  maxDuration: 300, // 5 minutes max for tasks
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ['./src/trigger'],
  build: {
    external: ['drizzle-orm'],
    extensions: [
      syncEnvVars(async () => {
        const result = config({ path: '.env.local' })
        if (!result.parsed) return []
        return Object.entries(result.parsed).map(([name, value]) => ({ name, value }))
      }),
    ],
  },
})
