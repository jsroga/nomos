/**
 * Live Trigger.dev smokes:
 *   - generate-tile via Apiframe Grok Imagine
 *   - Midjourney via Apiframe (shared client)
 *
 * Requires: `npm run trigger:dev`
 * Env: TRIGGER_SECRET_KEY, APIFRAME_API_KEY, BLOB_READ_WRITE_TOKEN
 *
 *   npm run test:smoke:tile-providers
 */
import { describe, expect, it } from 'vitest'
import { config as loadEnv } from 'dotenv'
import {
  newSubmissionNonce,
  retrieveSystemRun,
  SystemRunReason,
  triggerOwnedRun,
} from '@/shared/jobs'
import type { generateTileTask } from '@/domains/2d-canvas/tasks/generate-tile.task'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { ApiframeImageModel } from '@/shared/ai/constants/apiframe'
import { generateMidjourneyImages, pickApiframeImageUrl } from '@/shared/ai/apiframe'
import { TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { isPlainObject, readString } from '@/shared/data/json-guards'
import { TriggerEnvFile } from '../../../../../trigger.config.constants'

loadEnv({ path: TriggerEnvFile.Local })

enum TileProviderSmokeWire {
  DefaultProjectId = 'tile-provider-smoke',
  ApiframePrompt = 'isometric grassy meadow with a small stone path, painterly game tile --ar 1:1',
  GrokPrompt = 'isometric grassy meadow with a small stone path, painterly game tile',
  EnvTestProjectId = 'TEST_PROJECT_ID',
  EnvWildcardsProjectId = 'WILDCARDS_AB_PROJECT_ID',
  EnvApiframeApiKey = 'APIFRAME_API_KEY',
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
    const run = await retrieveSystemRun(runId, SystemRunReason.ProviderSmoke)
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
const hasApiframe = Boolean(process.env[TileProviderSmokeWire.EnvApiframeApiKey]?.trim())

describe.runIf(hasTrigger && hasBlob)('image providers (live Trigger)', () => {
  it.runIf(hasApiframe)(
    'generate-tile via Apiframe Grok Imagine',
    async () => {
      const apiframeKey = envOrSkip(TileProviderSmokeWire.EnvApiframeApiKey)
      const handle = await triggerOwnedRun<typeof generateTileTask>(TRIGGER_TASK_ID.GENERATE_TILE, {
        projectId: TEST_PROJECT_ID,
        requestId: newSubmissionNonce(),
        x: 90,
        y: 90,
        prompt: TileProviderSmokeWire.GrokPrompt,
        aiProvider: ImageGenProvider.Grok,
        aiConfig: {
          apiKey: apiframeKey,
          model: ApiframeImageModel.GrokImagineImage,
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

  it.runIf(hasApiframe)(
    'generate-tile via Apiframe Midjourney',
    async () => {
      const apiframeKey = envOrSkip(TileProviderSmokeWire.EnvApiframeApiKey)
      const handle = await triggerOwnedRun<typeof generateTileTask>(TRIGGER_TASK_ID.GENERATE_TILE, {
        projectId: TEST_PROJECT_ID,
        requestId: newSubmissionNonce(),
        x: 92,
        y: 92,
        prompt: TileProviderSmokeWire.GrokPrompt,
        aiProvider: ImageGenProvider.Midjourney,
        aiConfig: { apiKey: apiframeKey },
        isFirstTile: true,
      })

      const output = await waitForRunSuccess(handle.id)
      expect(output.success).toBe(true)
      const newUrl = readString(output.newUrl)
      expect(newUrl?.startsWith('http')).toBe(true)
    },
    TIMEOUT_MS + 30_000
  )

  it.runIf(hasApiframe)(
    'Apiframe Midjourney API key smoke',
    async () => {
      const apiframeKey = envOrSkip(TileProviderSmokeWire.EnvApiframeApiKey)
      const result = await generateMidjourneyImages(
        TileProviderSmokeWire.ApiframePrompt,
        apiframeKey,
        { aspectRatio: '1:1' },
      )
      expect(result.jobId.length).toBeGreaterThan(0)
      expect(Boolean(pickApiframeImageUrl(result))).toBe(true)
    },
    TIMEOUT_MS + 30_000
  )
})
