/**
 * Pure helpers for `scripts/storyteller-controller-cli.ts` — arg parsing, the
 * `submit_plan` suspend-payload reader, and CLI event rendering.
 *
 * Split out so they carry no DB / Mastra-runtime imports and stay unit-testable
 * (`scripts/__tests__/storyteller-controller-wire.test.ts`). `-wire.ts` matches
 * the repo's naming for pure mapper modules (`controller-sse-wire.ts`).
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type { SubmitPlanResumeData } from '@mastra/core/tools'
import type { ControllerFrameIntent } from '@/domains/storyteller/ai/controller/controller-sse-wire'
import { recordFromJson, readString } from '@/shared/data/json-guards'

// ---------- ANSI (same palette as scripts/storyteller-repl.ts) ----------
const ESC = '\x1b['
export const c = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  magenta: `${ESC}35m`,
  cyan: `${ESC}36m`,
  gray: `${ESC}90m`,
}
export const paint = (color: string, s: string): string => `${color}${s}${c.reset}`

export const PLAN_APPROVED: SubmitPlanResumeData['action'] = 'approved'
export const PLAN_REJECTED: SubmitPlanResumeData['action'] = 'rejected'
const DEFAULT_USER_ID = 'cli-user'

export const FLAG = {
  projectId: '--projectId',
  episodeId: '--episodeId',
  userId: '--userId',
  message: '--message',
  feedback: '--feedback',
  approve: '--approve',
  reject: '--reject',
  json: '--json',
  help: '--help',
}

export const USAGE = `storyteller:controller — drive the storyteller-chat AgentController from a terminal

  npm run storyteller:controller -- --projectId <uuid> [--episodeId <uuid>] [--userId <id>]
                                    [--message "..."] [--approve|--reject] [--feedback "..."] [--json]

  --message omitted → interactive REPL (/exit quits). Plan gates prompt inline
  unless --approve/--reject is supplied.`

// ---------- CLI events ----------
export type CliEvent =
  | { type: 'text'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'tool'; name: string }
  | { type: 'toolResult'; name: string; isError: boolean }
  | { type: 'note'; message: string }
  | { type: 'plan'; toolCallId: string; toolName: string; planPath?: string; body: string }
  | { type: 'decision'; action: SubmitPlanResumeData['action']; feedback?: string }
  | { type: 'error'; message: string }
  | { type: 'complete' }

export function proseFor(event: CliEvent): string {
  switch (event.type) {
    case 'text':
      return event.text
    case 'thinking':
      return paint(c.gray, event.text)
    case 'tool':
      return `\n${paint(c.cyan, `⚙ ${event.name}`)}\n`
    case 'toolResult':
      return paint(event.isError ? c.red : c.gray, `  ↳ ${event.name} ${event.isError ? 'failed' : 'done'}\n`)
    case 'note':
      return `\n${paint(c.yellow, `● ${event.message}`)}\n`
    case 'plan':
      return `\n${paint(c.bold + c.magenta, `— PLAN (${event.toolName}) —`)}\n${
        event.planPath ? paint(c.gray, `${event.planPath}\n`) : ''
      }${event.body}\n`
    case 'decision':
      return paint(c.green, `\n▸ ${event.action}${event.feedback ? `: ${event.feedback}` : ''}\n`)
    case 'error':
      return `\n${paint(c.red, `✖ ${event.message}`)}\n`
    case 'complete':
      return '\n'
  }
}

/** Map an SSE frame intent to a CLI event. `null` = nothing to print here. */
export function intentToCliEvent(intent: ControllerFrameIntent): CliEvent | null {
  switch (intent.kind) {
    case 'token':
      return { type: 'text', text: intent.token }
    case 'thinking':
      return { type: 'thinking', text: intent.thinking }
    case 'info':
      return { type: 'note', message: intent.message }
    case 'toolResult':
      return { type: 'toolResult', name: intent.toolName, isError: intent.isError }
    case 'error':
      return {
        type: 'error',
        message: intent.error instanceof Error ? intent.error.message : String(intent.error),
      }
    case 'complete':
      return { type: 'complete' }
    case 'planQuestion':
      return { type: 'note', message: `awaiting approval: ${intent.toolName}` }
    case 'status':
      return null // tool start — the CLI renders it from the raw event, with its name
  }
}

// ---------- option parsing ----------
export interface CliOptions {
  projectId: string
  episodeId?: string
  userId: string
  message?: string
  decision?: SubmitPlanResumeData['action']
  feedback?: string
  json: boolean
}

function collectArgs(argv: string[]): { values: Map<string, string>; switches: Set<string> } {
  const values = new Map<string, string>()
  const switches = new Set<string>()
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const next = argv[i + 1]
    if (next !== undefined && !next.startsWith('--')) {
      values.set(arg, next)
      i++
    } else {
      switches.add(arg)
    }
  }
  return { values, switches }
}

function optionalArg(values: Map<string, string>, flag: string, envValue?: string): string | undefined {
  const value = values.get(flag) ?? envValue
  return value && value.trim() ? value.trim() : undefined
}

/** The slice of `process.env` this CLI reads (not `NodeJS.ProcessEnv` — Next augments that). */
export type CliEnv = Record<string, string | undefined>

/** Parse argv into options, an error string, or `null` when `--help` was asked for. */
export function parseCliArgs(argv: string[], env: CliEnv): CliOptions | string | null {
  const { values, switches } = collectArgs(argv)
  if (switches.has(FLAG.help)) return null

  const projectId = optionalArg(values, FLAG.projectId, env.STORYTELLER_PROJECT_ID)
  if (!projectId) return `missing ${FLAG.projectId} (or STORYTELLER_PROJECT_ID)`
  const approve = switches.has(FLAG.approve)
  const reject = switches.has(FLAG.reject)
  if (approve && reject) return `${FLAG.approve} and ${FLAG.reject} are mutually exclusive`

  const options: CliOptions = {
    projectId,
    userId: optionalArg(values, FLAG.userId, env.STORYTELLER_USER_ID) ?? DEFAULT_USER_ID,
    json: switches.has(FLAG.json),
  }
  const episodeId = optionalArg(values, FLAG.episodeId, env.STORYTELLER_EPISODE_ID)
  if (episodeId) options.episodeId = episodeId
  const message = optionalArg(values, FLAG.message)
  if (message) options.message = message
  if (approve || reject) options.decision = approve ? PLAN_APPROVED : PLAN_REJECTED
  const feedback = optionalArg(values, FLAG.feedback)
  if (feedback) options.feedback = feedback
  return options
}

// ---------- suspension payload ----------
export interface PendingSuspension {
  toolCallId: string
  toolName: string
  planPath?: string
  planBody?: string
}

/** Read a `tool_suspended` payload (`submit_plan` suspends with `{ path, title?, plan? }`). */
export function readSuspension(event: {
  toolCallId: string
  toolName: string
  suspendPayload: unknown
}): PendingSuspension {
  const payload = recordFromJson(event.suspendPayload)
  const pending: PendingSuspension = { toolCallId: event.toolCallId, toolName: event.toolName }
  const planPath = readString(payload.path)
  if (planPath) pending.planPath = planPath
  const title = readString(payload.title)
  const plan = readString(payload.plan)
  const body = title && plan ? `# ${title}\n\n${plan}` : (plan ?? title)
  if (body) pending.planBody = body
  return pending
}

/**
 * `submit_plan` carries a plan FILE path, never the plan body — the host reads it
 * from disk. This controller configures no workspace, so the model has no tool to
 * write that file; fall back to naming the path it intended.
 */
export function resolvePlanBody(pending: PendingSuspension, cwd: string): string {
  if (pending.planBody) return pending.planBody
  if (!pending.planPath) return '(no plan payload — approve/reject on the conversation so far)'
  const absolute = path.isAbsolute(pending.planPath) ? pending.planPath : path.resolve(cwd, pending.planPath)
  if (fs.existsSync(absolute)) return fs.readFileSync(absolute, 'utf8')
  return `(no plan file on disk at ${pending.planPath} — this controller has no workspace, so the model could not write one; judge the intent from the conversation above)`
}
