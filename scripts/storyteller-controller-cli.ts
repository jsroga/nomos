/**
 * Storyteller AgentController CLI (PLAN-V2 Phase 4.4) — drives the
 * `storyteller-chat` controller from a terminal: chat mode → `submit_plan` →
 * approve/reject → `build` mode. No browser, no SSE, no auth cookie.
 *
 *   npm run storyteller:controller -- --projectId <uuid>                               # REPL
 *   npm run storyteller:controller -- --projectId <uuid> --message "what beats exist?"  # one-shot read
 *   npm run storyteller:controller -- --projectId <uuid> --message "rename act 2" --approve
 *   npm run storyteller:controller -- --projectId <uuid> --message "..." --reject --feedback "too broad"
 *   npm run storyteller:controller -- --projectId <uuid> --message "..." --json
 *
 *   --projectId <uuid>  required (else STORYTELLER_PROJECT_ID)
 *   --episodeId <uuid>  optional (else STORYTELLER_EPISODE_ID); rides RequestContext
 *   --userId <id>       session resourceId (else STORYTELLER_USER_ID, else `cli-user`)
 *   --message "..."     one-shot turn; omit for an interactive REPL (`/exit` quits)
 *   --approve|--reject  non-interactive answer to a plan gate (+ --feedback "...")
 *   --json              newline-delimited JSON events instead of prose
 *
 * Needs DATABASE_URL + an LLM key (.env.local). Talks to the controller
 * IN-PROCESS via `getStorytellerController()` — the same runtime seam the SSE
 * route uses — so `FF_STORYTELLER_CONTROLLER=true` (which only gates the HTTP route in
 * `stream-post-handler`) is NOT required. The HTTP path is untouched.
 *
 * This is the interactive probe. The same three guarantees are asserted
 * non-interactively by `storyteller-controller.e2e.test.ts` (`npm run test:live`).
 */

// MUST stay first: loads .env.local and neutralises `server-only` before any
// `@/` module is evaluated (see scripts/cli-preload.ts for why).
import './cli-preload'

import * as readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import type { AgentControllerEvent, Session } from '@mastra/core/agent-controller'
import { submitPlanTool } from '@mastra/core/agent-controller'
import type { SubmitPlanResumeData } from '@mastra/core/tools'
import type { RequestContext } from '@mastra/core/di'
import {
  createControllerStreamContext,
  mapControllerEvent,
  type ControllerStreamContext,
} from '@/domains/storyteller/ai/controller/controller-sse-wire'
import {
  buildStorytellerRequestContext,
  getStorytellerController,
} from '@/domains/storyteller/core/io/mastra-runtime'
import {
  StorytellerControllerMode,
  buildStorytellerControllerModes,
} from '@/domains/storyteller/ai/controller/storyteller-controller'
import { assembleStorytellerContext } from '@/domains/storyteller/services/context-assembly-service'
import { memoryRef } from '@/shared/agent-kernel/mastra/memory-ref'
import {
  c,
  paint,
  proseFor,
  intentToCliEvent,
  parseCliArgs,
  readSuspension,
  resolvePlanBody,
  FLAG,
  USAGE,
  PLAN_APPROVED,
  PLAN_REJECTED,
  type CliEvent,
  type CliOptions,
  type PendingSuspension,
} from './storyteller-controller-wire'

const write = (s: string): void => void stdout.write(s)
const renderProse = (event: CliEvent): void => write(proseFor(event))
const renderJson = (event: CliEvent): void => write(`${JSON.stringify(event)}\n`)

const SUBMIT_PLAN = submitPlanTool.id
const PROJECT_TAG = 'projectId'
const EPISODE_TAG = 'episodeId'
/** Upper bound on waiting for a resumed run to finish, so the terminal can never wedge. */
const RUN_SETTLE_TIMEOUT_MS = 10 * 60 * 1000

type StorytellerSession = Session<unknown>

interface TurnState {
  pending: PendingSuspension | null
  stream: ControllerStreamContext
}

interface CliContext {
  session: StorytellerSession
  requestContext: RequestContext
  options: CliOptions
  state: TurnState
  emit: (event: CliEvent) => void
  rl: readline.Interface | null
}

/**
 * Render one controller event. `mapControllerEvent` (the SSE mapper) owns the
 * cumulative text/thinking delta bookkeeping plus the mode/info/error mapping, so
 * the CLI and the web chat read identical event semantics. Two events get
 * CLI-only detail on top: `tool_start` (the mapper drops the tool name) and
 * `tool_suspended` — the plan gate, which the SSE mapper does not handle.
 */
function renderEvent(
  event: AgentControllerEvent,
  state: TurnState,
  emit: (cliEvent: CliEvent) => void
): void {
  if (event.type === 'tool_start') {
    emit({ type: 'tool', name: event.toolName })
  } else if (event.type === 'tool_suspended') {
    state.pending = readSuspension(event)
  }
  for (const intent of mapControllerEvent(event, state.stream)) {
    const cliEvent = intentToCliEvent(intent)
    if (cliEvent) emit(cliEvent)
  }
}

/** Resolve once the session's current run ends. Arm BEFORE the call that starts it. */
function waitForRunEnd(session: StorytellerSession): Promise<void> {
  return new Promise<void>(resolve => {
    let unsubscribe: (() => void) | undefined
    const timer = setTimeout(() => {
      unsubscribe?.()
      resolve()
    }, RUN_SETTLE_TIMEOUT_MS)
    unsubscribe = session.subscribe(event => {
      if (event.type !== 'agent_end') return
      clearTimeout(timer)
      unsubscribe?.()
      resolve()
    })
  })
}

async function askPlanDecision(ctx: CliContext): Promise<SubmitPlanResumeData | null> {
  if (ctx.options.decision) {
    const resume: SubmitPlanResumeData = { action: ctx.options.decision }
    if (ctx.options.feedback) resume.feedback = ctx.options.feedback
    return resume
  }
  if (!ctx.rl) {
    ctx.emit({ type: 'note', message: `plan left pending — rerun with ${FLAG.approve} or ${FLAG.reject}` })
    return null
  }
  const answer = (await ctx.rl.question(paint(c.yellow, '\nplan — [a]pprove / [r]eject: '))).trim()
  if (!answer.toLowerCase().startsWith('r')) return { action: PLAN_APPROVED }
  const feedback = (await ctx.rl.question(paint(c.gray, 'feedback (optional): '))).trim()
  return feedback ? { action: PLAN_REJECTED, feedback } : { action: PLAN_REJECTED }
}

/** Non-plan suspensions (e.g. `ask_user`, visible once build mode lifts the allowlist). */
async function askFreeTextResume(ctx: CliContext, pending: PendingSuspension): Promise<string | null> {
  if (!ctx.rl) {
    ctx.emit({ type: 'note', message: `${pending.toolName} left suspended (non-interactive run)` })
    return null
  }
  return (await ctx.rl.question(paint(c.yellow, `\n${pending.toolName} › `))).trim()
}

async function resolveSuspension(
  ctx: CliContext,
  pending: PendingSuspension
): Promise<SubmitPlanResumeData | string | null> {
  if (pending.toolName !== SUBMIT_PLAN) return askFreeTextResume(ctx, pending)

  const planEvent: CliEvent = {
    type: 'plan',
    toolCallId: pending.toolCallId,
    toolName: pending.toolName,
    body: resolvePlanBody(pending, process.cwd()),
  }
  if (pending.planPath) planEvent.planPath = pending.planPath
  ctx.emit(planEvent)

  const decision = await askPlanDecision(ctx)
  if (decision) ctx.emit({ type: 'decision', ...decision })
  return decision
}

/**
 * Drain every suspension the run parked on. `submit_plan` resumes route through
 * the controller's plan-approval path (`Session.respondToToolSuspension` →
 * `handlePlanApprovalResume`): approval flips the session to `build` via the
 * mode's native `transitionsTo`, rejection resumes the plan tool with feedback.
 */
async function settleSuspensions(ctx: CliContext): Promise<void> {
  for (;;) {
    const pending = ctx.state.pending
    if (!pending) return
    ctx.state.pending = null

    const resumeData = await resolveSuspension(ctx, pending)
    if (resumeData === null) return

    // `respondToToolSuspension` returns at the plan tool's `tool_end`, before the
    // resumed (build-mode) run finishes — so wait for `agent_end` as well.
    const settled = waitForRunEnd(ctx.session)
    await ctx.session.respondToToolSuspension({
      resumeData,
      toolCallId: pending.toolCallId,
      requestContext: ctx.requestContext,
    })
    await settled
  }
}

/** Assemble the same prompt the SSE route sends (`stream-post-handler`), then run a turn. */
async function runTurn(ctx: CliContext, message: string): Promise<void> {
  const { contextPrompt } = await assembleStorytellerContext({
    projectId: ctx.options.projectId,
    episodeId: ctx.options.episodeId,
    message,
    userId: ctx.options.userId,
    onError: error => ctx.emit({ type: 'note', message: `context assembly: ${String(error)}` }),
  })
  const prompt = contextPrompt
    ? `${contextPrompt}\nUSER REQUEST:\n${message}\n\nRemember: Use projectId="${ctx.options.projectId}" for all tool calls that require it.`
    : message

  await ctx.session.sendMessage({ content: prompt, requestContext: ctx.requestContext })
  await settleSuspensions(ctx)
  ctx.emit({ type: 'note', message: `mode: ${ctx.session.mode.get()}` })
}

/**
 * Auto-allow the read-only tools that `chat` mode exposes.
 *
 * `Session.resolveToolApproval` falls through to `"ask"` for any tool with no
 * per-tool policy, no category grant and no `toolCategoryResolver` — and the
 * storyteller controller configures none of those. Without this, every call
 * gates on approval, including `list_beats`, which makes even a plain read
 * impossible to answer. Per-tool policy is consulted before categories, so this
 * needs no change to the shared controller config.
 *
 * The list is derived from the mode definition rather than hardcoded, so it
 * cannot drift from `CHAT_MODE_TOOLS`. `submit_plan` is excluded deliberately:
 * its suspension IS the plan gate.
 */
async function allowChatModeReads(session: Session): Promise<void> {
  const chatMode = buildStorytellerControllerModes().find(
    mode => mode.id === StorytellerControllerMode.Chat
  )
  for (const toolName of chatMode?.availableTools ?? []) {
    await session.permissions.setForTool({ toolName, policy: 'allow' })
  }
}

// ---------- bootstrap ----------
/** Parse + validate argv and env, or exit with usage. */
function resolveOptions(): CliOptions {
  const parsed = parseCliArgs(process.argv.slice(2), process.env)
  if (parsed === null) {
    write(`${USAGE}\n`)
    process.exit(0)
  }
  if (typeof parsed === 'string') {
    write(`${paint(c.red, `storyteller:controller: ${parsed}`)}\n\n${USAGE}\n`)
    process.exit(1)
  }
  const hasLlmKey =
    process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY
  if (!process.env.DATABASE_URL || !hasLlmKey) {
    write(paint(c.red, 'storyteller:controller: needs DATABASE_URL + an LLM key (OPENROUTER/ANTHROPIC/OPENAI).\n'))
    process.exit(1)
  }
  return parsed
}

async function createCliContext(options: CliOptions): Promise<CliContext> {
  const controller = await getStorytellerController()
  const bound = memoryRef({
    projectId: options.projectId,
    episodeId: options.episodeId,
    userId: options.userId,
  })
  const session = await controller.createSession({
    resourceId: bound.resource,
    threadId: bound.thread,
    tags: {
      [PROJECT_TAG]: options.projectId,
      ...(options.episodeId ? { [EPISODE_TAG]: options.episodeId } : {}),
    },
  })
  await allowChatModeReads(session)
  const state: TurnState = { pending: null, stream: createControllerStreamContext() }
  const emit = options.json ? renderJson : renderProse
  session.subscribe(event => renderEvent(event, state, emit))

  const contextInput: Parameters<typeof buildStorytellerRequestContext>[0] = {
    projectId: options.projectId,
  }
  if (options.episodeId) contextInput.episodeId = options.episodeId

  return {
    session,
    requestContext: buildStorytellerRequestContext(contextInput),
    options,
    state,
    emit,
    rl: options.message ? null : readline.createInterface({ input: stdin, output: stdout }),
  }
}

function banner(ctx: CliContext): void {
  if (ctx.options.json) return
  write(`\n${paint(c.magenta + c.bold, '  Storyteller controller')} ${paint(c.gray, 'storyteller-chat')}\n`)
  const rows: Array<[string, string]> = [
    ['project', ctx.options.projectId],
    ['episode', ctx.options.episodeId ?? '(project level)'],
    ['user', ctx.options.userId],
    ['mode', ctx.session.mode.get()],
  ]
  for (const [label, value] of rows) write(`  ${paint(c.gray, label.padEnd(7))} ${value}\n`)
  write('\n')
}

async function repl(ctx: CliContext, rl: readline.Interface): Promise<void> {
  for (;;) {
    const line = (await rl.question(paint(c.magenta, 'controller › '))).trim()
    if (!line) continue
    if (line === '/exit' || line === '/quit') break
    try {
      await runTurn(ctx, line)
    } catch (error) {
      ctx.emit({ type: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }
  rl.close()
  write(paint(c.gray, '\nbye.\n'))
}

async function main(): Promise<void> {
  const options = resolveOptions()
  const ctx = await createCliContext(options)
  banner(ctx)

  if (options.message) {
    await runTurn(ctx, options.message)
  } else if (ctx.rl) {
    await repl(ctx, ctx.rl)
  }
  process.exit(0)
}

void main()
