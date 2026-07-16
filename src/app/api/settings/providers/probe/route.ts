/**
 * POST /api/settings/providers/probe — live provider health check (PLAN-V2 1.4).
 * (Named "probe" — the src/app structure test forbids folders named "test".)
 *
 * `{ providerKey }` → one tiny generation against that provider's catalog
 * model through the SAME resolution path production uses
 * (`resolveStorytellerModel` — so GLM's custom endpoint is what actually gets
 * tested) → `{ ok, latencyMs, model, error? }`.
 *
 * Guarantees: auth-gated, rate-limited (5/min), 10s timeout, never a 500 for
 * a provider failure (always `{ ok: false, error }`), never leaks key material
 * (only our own catalog/env-var names appear in errors).
 */

import { NextRequest, NextResponse } from 'next/server'
import { Agent } from '@mastra/core/agent'
import { z } from 'zod'
import { requireAuth, withRateLimit } from '@/shared/data/api-utils'
import { CHAT_MODELS } from '@/domains/storyteller/config/constants/chat-model-catalog'
import { resolveStorytellerModel } from '@/domains/storyteller/config/constants/model-config'
import { getErrorMessage } from '@/shared/errors/error-utils'

// Node.js Runtime required for Mastra core dependencies
// eslint-disable-next-line local/no-magic-string -- Next.js segment config must be a statically analyzable literal (user-approved exception, 2026-07-09)
export const runtime = 'nodejs'

const TEST_TIMEOUT_MS = 10_000
const RATE_LIMIT_KEY_PREFIX = 'provider-test'
const RATE_LIMIT = { maxRequests: 5, windowMs: 60_000, keyPrefix: RATE_LIMIT_KEY_PREFIX }
const REDACTED_PLACEHOLDER = '[redacted]'

const PROBE_AGENT_ID = 'provider-probe'
const PROBE_AGENT_NAME = 'Provider Probe'
const PROBE_INSTRUCTIONS = 'You are a connectivity probe. Reply with exactly: OK'
const PROBE_PROMPT = 'ping'

const ERR_UNAUTHORIZED = 'Unauthorized'
const ERR_INVALID_BODY = 'Invalid body: expected { providerKey: string }'
const ERR_NOT_TESTABLE = 'Provider has no testable chat model in the catalog'
const ERR_TIMEOUT = `Provider did not respond within ${TEST_TIMEOUT_MS / 1000}s`
const CONTENT_TYPE_JSON = 'application/json'

const bodySchema = z.object({ providerKey: z.string().min(1) })

/** Redact anything that looks like a secret from provider error messages. */
function sanitizeError(message: string): string {
  // Long unbroken token-ish substrings are the risk surface (sk-..., etc.).
  return message.replace(/[A-Za-z0-9_-]{20,}/g, REDACTED_PLACEHOLDER)
}

async function probeProvider(modelId: string): Promise<void> {
  const model = resolveStorytellerModel(modelId)
  const agent = new Agent({
    id: PROBE_AGENT_ID,
    name: PROBE_AGENT_NAME,
    instructions: PROBE_INSTRUCTIONS,
    model,
  })

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(ERR_TIMEOUT)), TEST_TIMEOUT_MS)
  })
  try {
    await Promise.race([agent.generate(PROBE_PROMPT, { maxSteps: 1 }), timeout])
  } finally {
    clearTimeout(timer)
  }
}

async function handleTest(request: NextRequest): Promise<NextResponse> {
  const { error } = await requireAuth()
  if (error) {
    return NextResponse.json({ ok: false, error: ERR_UNAUTHORIZED }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: ERR_INVALID_BODY }, { status: 400 })
  }

  const option = CHAT_MODELS.find(model => model.providerKey === parsed.data.providerKey)
  if (!option) {
    return NextResponse.json({ ok: false, error: ERR_NOT_TESTABLE }, { status: 400 })
  }

  const start = Date.now()
  try {
    await probeProvider(option.id)
    return NextResponse.json({ ok: true, latencyMs: Date.now() - start, model: option.id })
  } catch (probeError) {
    // Provider failures are a RESULT, not a server error — always 200 + ok:false.
    return NextResponse.json(
      {
        ok: false,
        latencyMs: Date.now() - start,
        model: option.id,
        error: sanitizeError(getErrorMessage(probeError)),
      },
      { headers: { 'Content-Type': CONTENT_TYPE_JSON } }
    )
  }
}

export const POST = withRateLimit(handleTest, RATE_LIMIT)
