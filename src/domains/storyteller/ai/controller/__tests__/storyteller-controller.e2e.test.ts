/**
 * controller-full tier: the `storyteller-chat` AgentController end to end with
 * the REAL agent, REAL OpenRouter models and the REAL database. Local-only,
 * excluded from `test:unit` (`*.e2e.test.ts`). Run explicitly:
 *
 *   CONTROLLER_E2E_PROJECT_ID=<uuid> npm run test:live -- <this file>
 *
 * Needs: DATABASE_URL, an LLM key, and CONTROLLER_E2E_PROJECT_ID pointing at a
 * SCRATCH project — the approve case mutates it (and cleans up after itself).
 *
 * Three assertions the mechanics tier cannot make, because each depends on what
 * a live model actually decides to do:
 *   1. chat mode answers a read WITHOUT demanding a plan.
 *   2. a mutate request is forced through `submit_plan`; rejection writes nothing.
 *   3. approval flips the session to `build` (native `transitionsTo`).
 *
 * The async shape matters here and is not obvious:
 *   - `sendMessage` does NOT resolve while a run is parked on a suspension — it
 *     waits for the whole run, and the run is waiting for us. Turns that hit the
 *     plan gate are therefore started WITHOUT await.
 *   - `respondToToolSuspension` does not reliably settle either: a rejected plan
 *     sends the model straight back to `submit_plan`, so the resume can stay
 *     open indefinitely. It is raced against a short settle window.
 *   - Each test gets its OWN session. One shared session serializes runs, so a
 *     later test blocks behind an earlier test's still-open turn.
 */

import { afterAll, describe, expect, it } from 'vitest'
import type { AgentControllerEvent, Session } from '@mastra/core/agent-controller'
import { submitPlanTool } from '@mastra/core/agent-controller'
import { getStorytellerController } from '@/domains/storyteller/core/io/mastra-runtime'
import { buildStorytellerRequestContext } from '@/domains/storyteller/ai/request-context'
import {
  StorytellerControllerMode,
  buildStorytellerControllerModes,
} from '@/domains/storyteller/ai/controller/storyteller-controller'

const projectId = process.env.CONTROLLER_E2E_PROJECT_ID ?? ''
const hasLlmKey = Boolean(
  process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY
)
const ready = Boolean(process.env.DATABASE_URL && hasLlmKey && projectId)

const PROJECT_TAG = 'projectId'
const TEST_TIMEOUT_MS = 240_000
const GATE_WAIT_MS = 150_000
/** How long to let a resume settle before moving on; it may never settle by design. */
const RESUME_SETTLE_MS = 15_000
const SCRATCH_CHARACTER = 'E2E Controller Probe'
const MANAGE_CHARACTER_TOOL = 'manage_character'
const LIST_BEATS_TOOL = 'list_beats'

interface Suspension {
  toolCallId: string
  toolName: string
}

interface Harness {
  session: Session<unknown>
  events: AgentControllerEvent[]
  suspensions: Suspension[]
}

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

async function createHarness(): Promise<Harness> {
  const controller = await getStorytellerController()
  const session = await controller.createSession({
    resourceId: `controller-e2e-${Date.now()}`,
    tags: { [PROJECT_TAG]: projectId },
  })

  // `resolveToolApproval` falls through to "ask" for every tool (the controller
  // configures no `toolCategoryResolver`), which would gate even `list_beats`.
  // Per-tool policy is consulted first. `submit_plan` is included on purpose:
  // leaving it at "ask" raises a PERMISSION gate before the tool runs, which
  // pre-empts the real plan gate that carries the mode transition.
  const chatMode = buildStorytellerControllerModes().find(
    mode => mode.id === StorytellerControllerMode.Chat
  )
  for (const toolName of chatMode?.availableTools ?? []) {
    await session.permissions.setForTool({ toolName, policy: 'allow' })
  }

  const events: AgentControllerEvent[] = []
  const suspensions: Suspension[] = []
  session.subscribe(event => {
    events.push(event)
    if (event.type === 'tool_suspended') {
      suspensions.push({ toolCallId: event.toolCallId, toolName: event.toolName })
    }
  })

  return { session, events, suspensions }
}

function toolNamesUsed(events: AgentControllerEvent[]): string[] {
  return events.flatMap(event => (event.type === 'tool_start' ? [event.toolName] : []))
}

/** Start a turn. Never awaited by the plan tests — see the file header. */
function send(harness: Harness, content: string): Promise<void> {
  return harness.session
    .sendMessage({
      content: `${content}\n\nUse projectId="${projectId}" for any tool call that needs it.`,
      requestContext: buildStorytellerRequestContext({ projectId }),
    })
    .catch(() => undefined)
}

/** Resolve when the run parks on `toolName`; reject on an `error` event first. */
function waitForGate(harness: Harness, toolName: string): Promise<Suspension> {
  const already = harness.suspensions.find(s => s.toolName === toolName)
  if (already) return Promise.resolve(already)

  return new Promise<Suspension>((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe()
      reject(new Error(`no ${toolName} gate within ${GATE_WAIT_MS}ms`))
    }, GATE_WAIT_MS)

    const unsubscribe = harness.session.subscribe(event => {
      if (event.type === 'tool_suspended' && event.toolName === toolName) {
        clearTimeout(timer)
        unsubscribe()
        resolve({ toolCallId: event.toolCallId, toolName: event.toolName })
      } else if (event.type === 'error') {
        clearTimeout(timer)
        unsubscribe()
        reject(new Error(`controller error before the gate: ${JSON.stringify(event.error)}`))
      }
    })
  })
}

async function scratchCharacterRows() {
  const { db } = await import('@/db/client')
  const { characters } = await import('@/db/schema')
  const { and, eq } = await import('drizzle-orm')
  return db
    .select()
    .from(characters)
    .where(and(eq(characters.projectId, projectId), eq(characters.name, SCRATCH_CHARACTER)))
}

afterAll(async () => {
  if (!ready) return
  const { db } = await import('@/db/client')
  const { characters } = await import('@/db/schema')
  const { and, eq } = await import('drizzle-orm')
  await db
    .delete(characters)
    .where(and(eq(characters.projectId, projectId), eq(characters.name, SCRATCH_CHARACTER)))
}, TEST_TIMEOUT_MS)

describe.skipIf(!ready)('storyteller controller (live)', () => {
  it(
    'answers a read-only question in chat mode without demanding a plan',
    async () => {
      const harness = await createHarness()
      await send(harness, 'How many beats exist in this project? Answer briefly; change nothing.')

      expect(harness.session.mode.get()).toBe(StorytellerControllerMode.Chat)
      expect(toolNamesUsed(harness.events)).toContain(LIST_BEATS_TOOL)
      expect(harness.suspensions).toHaveLength(0)
    },
    TEST_TIMEOUT_MS
  )

  it(
    'forces a mutate request through submit_plan, and rejection writes nothing',
    async () => {
      const harness = await createHarness()
      void send(
        harness,
        `Add a new character named "${SCRATCH_CHARACTER}" with a one-line description.`
      )

      const gate = await waitForGate(harness, submitPlanTool.id)
      // Mutating tools are invisible until an approved plan.
      expect(toolNamesUsed(harness.events)).not.toContain(MANAGE_CHARACTER_TOOL)

      await Promise.race([
        harness.session.respondToToolSuspension({
          toolCallId: gate.toolCallId,
          resumeData: { action: 'rejected', feedback: 'e2e: rejecting on purpose' },
        }),
        delay(RESUME_SETTLE_MS),
      ])

      expect(harness.session.mode.get()).toBe(StorytellerControllerMode.Chat)
      expect(
        await scratchCharacterRows(),
        'a rejected plan must not persist anything'
      ).toHaveLength(0)
    },
    TEST_TIMEOUT_MS
  )

  it(
    'flips to build mode when a plan is approved',
    async () => {
      const harness = await createHarness()
      void send(
        harness,
        `Add a new character named "${SCRATCH_CHARACTER}" with a one-line description.`
      )

      const gate = await waitForGate(harness, submitPlanTool.id)

      await Promise.race([
        harness.session.respondToToolSuspension({
          toolCallId: gate.toolCallId,
          resumeData: { action: 'approved' },
        }),
        delay(RESUME_SETTLE_MS),
      ])

      // `handlePlanApprovalResume` switches the mode BEFORE resuming the run,
      // so this holds even though the resumed run is still in flight.
      expect(harness.session.mode.get()).toBe(StorytellerControllerMode.Build)
    },
    TEST_TIMEOUT_MS
  )
})
