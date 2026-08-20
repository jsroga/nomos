import { defineConfig } from '@trigger.dev/sdk/v3'
import { ffmpeg, syncEnvVars } from '@trigger.dev/build/extensions/core'
import { config } from 'dotenv'
import {
  TRIGGER_DIRS,
  TRIGGER_PROJECT_REF,
  TriggerBuildExternal,
  TriggerEnvFile,
  TriggerLogLevel,
  TriggerRuntime,
} from './trigger.config.constants'

export default defineConfig({
  project: TRIGGER_PROJECT_REF, // world-building-kit project
  runtime: TriggerRuntime.Node,
  logLevel: TriggerLogLevel.Log,
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
  dirs: [...TRIGGER_DIRS],
  build: {
    external: [
      TriggerBuildExternal.DrizzleOrm,
      TriggerBuildExternal.Sharp,
      TriggerBuildExternal.FfmpegStatic,
      TriggerBuildExternal.FfprobeStatic,
    ],
    extensions: [
      ffmpeg(),
      syncEnvVars(async () => {
        const result = config({ path: TriggerEnvFile.Local })
        if (!result.parsed) return []
        return Object.entries(result.parsed).map(([name, value]) => ({ name, value }))
      }),
    ],
  },
})
