/**
 * Live Trigger.dev smokes:
 *   - generate-tile via OpenRouter Grok Imagine
 *   - LegNext diffusion via shared client (tile upload_paint is whitelist-gated)
 *
 * Requires: `npm run trigger:dev`
 * Env: TRIGGER_SECRET_KEY, OPENROUTER_API_KEY, LEGNEXT_API_KEY, BLOB_READ_WRITE_TOKEN
 *
 *   npm run test:smoke:tile-providers
 */
import { describe, expect, it } from 'vitest'
import { config as loadEnv } from 'dotenv'
import { tasks, runs } from '@trigger.dev/sdk/v3'
import type { generateTileTask } from '@/domains/2d-canvas/tasks/generate-tile.task'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { OpenRouterImageModel } from '@/shared/ai/constants/openrouter-image'
import { submitImagineTask, pollLegNextTask } from '@/shared/ai/legnext'
import { EnvVarName } from '@/shared/data/constants/protocol'
import { TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { isPlainObject, readString } from '@/shared/data/json-guards'
import { TriggerEnvFile } from '../../../../../trigger.config.constants'

loadEnv({ path: TriggerEnvFile.Local })

enum TileProviderSmokeWire {
  DefaultProjectId = 'tile-provider-smoke',
  LegNextPrompt = 'isometric grassy meadow with a small stone path, painterly game tile --ar 1:1',
  GrokPrompt = 'isometric grassy meadow with a small stone path, painterly game tile',
  EnvTestProjectId = 'TEST_PROJECT_ID',
  EnvWildcardsProjectId = 'WILDCARDS_AB_PROJECT_ID',
  EnvLegNextApiKey = 'LEGNEXT_API_KEY',
  EnvTriggerSecret = 'TRIGGER_SECRET_KEY',
  EnvBlobToken = 'BLOB_READ_WRITE_TOKEN',
}

const POLL_MS = 3_000
const TIMEOUT_MS = 240_000
const TEST_PROJECT_ID =
  process.env[TileProviderSmokeWire.EnvTestProjectId] ??
  process.env[TileProviderSmokeWire.EnvWildcardsProjectId] ??
  TileProviderSmokeWire.DefaultProjectId

function envOrSkip(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`skip: ${name} not set`)
  }
  return value
}

async function waitForRunSuccess(runId: string): Promise<Record<string, unknown>> {
  const deadline = Date.now() + TIMEOUT_MS
  while (Date.now() < deadline) {
    const run = await runs.retrieve(runId)
    if (run.isCompleted) {
      expect(run.isSuccess, `run ${runId} failed: ${JSON.stringify(run.error ?? run.status)}`).toBe(
        true
      )
      if (!isPlainObject(run.output)) {
        throw new Error(`run ${runId} missing object output`)
      }
      return run.output
    }
    if (run.isFailed) {
      throw new Error(`Trigger run ${runId} failed: ${JSON.stringify(run.error ?? run.status)}`)
    }
    await new Promise(resolve => setTimeout(resolve, POLL_MS))
  }
  throw new Error(`Timed out waiting for Trigger run ${runId}`)
}

const hasTrigger = Boolean(process.env[TileProviderSmokeWire.EnvTriggerSecret]?.trim())
const hasBlob = Boolean(process.env[TileProviderSmokeWire.EnvBlobToken]?.trim())
const hasOpenRouter = Boolean(process.env[EnvVarName.OpenRouterApiKey]?.trim())
const hasLegNext = Boolean(process.env[TileProviderSmokeWire.EnvLegNextApiKey]?.trim())

describe.runIf(hasTrigger && hasBlob)('image providers (live Trigger)', () => {
  it.runIf(hasOpenRouter)(
    'generate-tile via OpenRouter Grok Imagine',
    async () => {
      const openRouterKey = envOrSkip(EnvVarName.OpenRouterApiKey)
      const handle = await tasks.trigger<typeof generateTileTask>(TRIGGER_TASK_ID.GENERATE_TILE, {
        projectId: TEST_PROJECT_ID,
        x: 90,
        y: 90,
        prompt: TileProviderSmokeWire.GrokPrompt,
        aiProvider: ImageGenProvider.Grok,
        aiConfig: {
          apiKey: openRouterKey,
          model: OpenRouterImageModel.GrokImagineImageQuality,
        },
        isFirstTile: true,
      })

      const output = await waitForRunSuccess(handle.id)
      expect(output.success).toBe(true)
      const newUrl = readString(output.newUrl)
      expect(newUrl?.startsWith('http')).toBe(true)
    },
    TIMEOUT_MS + 30_000
  )

  it.runIf(hasLegNext)(
    'generate-tile via LegNext upload_paint / Midjourney',
    async () => {
      const legNextKey = envOrSkip(TileProviderSmokeWire.EnvLegNextApiKey)
      const handle = await tasks.trigger<typeof generateTileTask>(TRIGGER_TASK_ID.GENERATE_TILE, {
        projectId: TEST_PROJECT_ID,
        x: 92,
        y: 92,
        prompt: TileProviderSmokeWire.GrokPrompt,
        aiProvider: ImageGenProvider.Midjourney,
        aiConfig: { apiKey: legNextKey },
        isFirstTile: true,
      })

      const output = await waitForRunSuccess(handle.id)
      expect(output.success).toBe(true)
      const newUrl = readString(output.newUrl)
      expect(newUrl?.startsWith('http')).toBe(true)
    },
    TIMEOUT_MS + 30_000
  )

  it.runIf(hasLegNext)(
    'LegNext diffusion API key smoke',
    async () => {
      const legNextKey = envOrSkip(TileProviderSmokeWire.EnvLegNextApiKey)
      const jobId = await submitImagineTask(TileProviderSmokeWire.LegNextPrompt, legNextKey)
      expect(jobId.length).toBeGreaterThan(0)
      const output = await pollLegNextTask(jobId, legNextKey)
      const imageUrl = output.image_url ?? output.image_urls?.[0]
      expect(Boolean(imageUrl)).toBe(true)
    },
    TIMEOUT_MS + 30_000
  )
})
