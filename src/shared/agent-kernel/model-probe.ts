/**
 * "Test this model" probe for the admin panel (roadmap A1).
 *
 * Sends the smallest possible completion to OpenRouter with the id the admin
 * typed. Deliberately a raw `fetch` against the gateway rather than an SDK path:
 * the question being answered is "does OUR key serve THIS id", and every SDK
 * layer in between (Mastra router, AI-SDK provider remaps, model policy) can
 * rewrite the id and hide the real answer.
 */

import '@/shared/data/server-guard'
import { OPENROUTER_BASE_URL, openRouterClientConfig } from '@/shared/agent-kernel/models'
import { readJsonBody } from '@/shared/data/fetch-json-record'
import { isOpenRouterModelId } from '@/shared/agent-kernel/constants/model-settings'
import {
  MODEL_PROBE_AUTH_HEADER,
  MODEL_PROBE_CONTENT_TYPE_HEADER,
  MODEL_PROBE_MAX_TOKENS,
  MODEL_PROBE_PATH,
  MODEL_PROBE_PROMPT,
  MODEL_PROBE_SAMPLE_MAX_CHARS,
  MODEL_PROBE_TIMEOUT_MS,
  ModelProbeError,
} from '@/shared/agent-kernel/constants/model-probe'
import {
  HttpMethod,
  ContentType,
  HttpAuthScheme,
  OpenAiChatRole,
} from '@/shared/data/constants/protocol'
import { readString, recordArrayFromJson, recordFromJson } from '@/shared/data/json-guards'
import { getErrorMessage } from '@/shared/errors/error-utils'

export interface ModelProbeResult {
  ok: boolean
  model: string
  latencyMs: number
  /** First few characters the model produced — proof it actually ran. */
  sample?: string
  error?: string
}

function readCompletionText(payload: unknown): string | undefined {
  const choices = recordArrayFromJson(recordFromJson(payload).choices)
  const first = choices[0]
  if (!first) return undefined
  const message = recordFromJson(first.message)
  return readString(message.content) ?? readString(first.text)
}

function readApiError(payload: unknown): string | undefined {
  const error = recordFromJson(recordFromJson(payload).error)
  return readString(error.message)
}

/** Probe `model` through the configured OpenRouter key. Never throws. */
export async function probeModel(model: string): Promise<ModelProbeResult> {
  const trimmed = model.trim()
  const started = Date.now()

  if (!isOpenRouterModelId(trimmed)) {
    return { ok: false, model: trimmed, latencyMs: 0, error: ModelProbeError.InvalidId }
  }

  const { apiKey } = openRouterClientConfig()
  if (!apiKey) {
    return { ok: false, model: trimmed, latencyMs: 0, error: ModelProbeError.MissingKey }
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}${MODEL_PROBE_PATH}`, {
      method: HttpMethod.Post,
      headers: {
        [MODEL_PROBE_AUTH_HEADER]: `${HttpAuthScheme.Bearer}${apiKey}`,
        [MODEL_PROBE_CONTENT_TYPE_HEADER]: ContentType.Json,
      },
      body: JSON.stringify({
        model: trimmed,
        max_tokens: MODEL_PROBE_MAX_TOKENS,
        messages: [{ role: OpenAiChatRole.User, content: MODEL_PROBE_PROMPT }],
      }),
      signal: AbortSignal.timeout(MODEL_PROBE_TIMEOUT_MS),
    })

    const latencyMs = Date.now() - started
    const payload: unknown = await readJsonBody(response, {})

    if (!response.ok) {
      return {
        ok: false,
        model: trimmed,
        latencyMs,
        error: readApiError(payload) ?? `${response.status} ${response.statusText}`,
      }
    }

    const text = readCompletionText(payload)?.trim()
    if (!text) {
      return { ok: false, model: trimmed, latencyMs, error: ModelProbeError.NoContent }
    }

    return {
      ok: true,
      model: trimmed,
      latencyMs,
      sample: text.slice(0, MODEL_PROBE_SAMPLE_MAX_CHARS),
    }
  } catch (error) {
    const latencyMs = Date.now() - started
    const timedOut = latencyMs >= MODEL_PROBE_TIMEOUT_MS
    return {
      ok: false,
      model: trimmed,
      latencyMs,
      error: timedOut ? ModelProbeError.Timeout : `${ModelProbeError.Unreachable} ${getErrorMessage(error)}`,
    }
  }
}
