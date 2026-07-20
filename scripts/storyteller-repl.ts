/**
 * Storyteller terminal REPL — drive the SAME orchestration the web user works on,
 * from a shell, with a live streaming UI.
 *
 *   npm run storyteller:repl            (interactive — pick a project/episode)
 *
 * What it exercises (same pieces as /api/storyteller/chat/stream):
 *   - assembleStorytellerContext → createStorytellerAgent → agent.stream()
 *   - tools (bible/beats/characters/episodes + the beat-draft workflow)
 *   - the editorial-verdict HITL (approve / revise / kill) via /beat
 *
 * Needs: DATABASE_URL + an LLM key. Picks project/episode interactively (or from
 * STORYTELLER_PROJECT_ID / STORYTELLER_EPISODE_ID). No args.
 */

import * as readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { eq } from 'drizzle-orm'
import { Mastra } from '@mastra/core/mastra'
import { db } from '@/db/client'
import { projects, episodes } from '@/db/schema'
import { createStorytellerAgent } from '@/domains/storyteller/ai'
import { assembleStorytellerContext } from '@/domains/storyteller/services/context-assembly-service'
import { buildStorytellerRequestContext } from '@/domains/storyteller/core/io/mastra-runtime'
import {
  createBeatDraftWorkflow,
  defaultBeatDraftDeps,
} from '@/domains/storyteller/ai/workflows/beat-draft-workflow'
import { beatDraftOutputSchema, VERDICT_STEP_ID } from '@/domains/storyteller/ai/workflows/beat-draft-contract'
import { BeatDraftVerdictAction } from '@/domains/storyteller/ai/workflows/constants/beat-draft-workflow'
import { recordFromJson, readString } from '@/shared/data/json-guards'

// ---------- ANSI ----------
const ESC = '\x1b['
const c = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  magenta: `${ESC}35m`,
  cyan: `${ESC}36m`,
  gray: `${ESC}90m`,
}
const paint = (color: string, s: string): string => `${color}${s}${c.reset}`
const write = (s: string): void => void stdout.write(s)

// ---------- spinner ----------
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
function makeSpinner(label: string) {
  let i = 0
  let timer: NodeJS.Timeout | null = null
  return {
    start() {
      timer = setInterval(() => {
        write(`\r${paint(c.cyan, SPINNER_FRAMES[i++ % SPINNER_FRAMES.length])} ${paint(c.gray, label)}`)
      }, 80)
    },
    stop() {
      if (timer) clearInterval(timer)
      timer = null
      write(`\r${' '.repeat(label.length + 4)}\r`)
    },
  }
}

// ---------- streaming chunk types (Mastra fullStream) ----------
const CHUNK = {
  error: 'error',
  textDelta: 'text-delta',
  reasoningDelta: 'reasoning-delta',
  toolCall: 'tool-call',
  toolResult: 'tool-result',
  stepStart: 'step-start',
}

function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env.local')
  dotenv.config(fs.existsSync(envPath) ? { path: envPath } : undefined)
}

function hasLlmKey(): boolean {
  return Boolean(
    process.env.MOONSHOT_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY
  )
}

interface Selection {
  projectId: string
  projectName: string
  episodeId: string
  episodeTitle: string
}

async function pickFromList<T>(
  rl: readline.Interface,
  title: string,
  rows: T[],
  label: (row: T) => string
): Promise<T | null> {
  if (rows.length === 0) return null
  if (rows.length === 1) return rows[0]
  write(`\n${paint(c.bold, title)}\n`)
  rows.forEach((row, idx) => write(`  ${paint(c.cyan, String(idx + 1))}. ${label(row)}\n`))
  const answer = await rl.question(paint(c.gray, 'pick # (or enter for 1): '))
  const idx = answer.trim() ? parseInt(answer.trim(), 10) - 1 : 0
  return rows[idx] ?? rows[0]
}

async function resolveSelection(rl: readline.Interface): Promise<Selection | null> {
  const envProject = process.env.STORYTELLER_PROJECT_ID
  const envEpisode = process.env.STORYTELLER_EPISODE_ID

  const projectRows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .limit(30)
  const project = envProject
    ? projectRows.find(p => p.id === envProject) ?? { id: envProject, name: envProject }
    : await pickFromList(rl, 'Projects', projectRows, p => `${p.name ?? '(untitled)'}  ${paint(c.gray, p.id)}`)
  if (!project) {
    write(paint(c.red, 'No projects found.\n'))
    return null
  }

  const episodeRows = await db
    .select({ id: episodes.id, title: episodes.title, sequence: episodes.sequence })
    .from(episodes)
    .where(eq(episodes.projectId, project.id))
    .limit(30)
  const episode = envEpisode
    ? episodeRows.find(e => e.id === envEpisode) ?? { id: envEpisode, title: null, sequence: null }
    : await pickFromList(rl, 'Episodes', episodeRows, e => `${e.title ?? `Episode ${e.sequence ?? '?'}`}  ${paint(c.gray, e.id)}`)
  if (!episode) {
    write(paint(c.yellow, 'No episodes for this project — chatting at the project level.\n'))
    return { projectId: project.id, projectName: project.name ?? project.id, episodeId: '', episodeTitle: '' }
  }

  return {
    projectId: project.id,
    projectName: project.name ?? project.id,
    episodeId: episode.id,
    episodeTitle: episode.title ?? `Episode ${episode.sequence ?? '?'}`,
  }
}

// ---------- render one agent stream ----------
async function streamChat(
  agent: Awaited<ReturnType<typeof createStorytellerAgent>>,
  sel: Selection,
  message: string,
  userId: string
): Promise<void> {
  const spin = makeSpinner('assembling context…')
  spin.start()
  const { contextPrompt } = await assembleStorytellerContext({
    projectId: sel.projectId,
    episodeId: sel.episodeId || undefined,
    message,
    userId,
  })
  const prompt = contextPrompt
    ? `${contextPrompt}\nUSER REQUEST:\n${message}\n\nRemember: Use projectId="${sel.projectId}" for all tool calls that require it.`
    : message
  const requestContext = buildStorytellerRequestContext({
    projectId: sel.projectId,
    episodeId: sel.episodeId || undefined,
  })
  const result = await agent.stream(prompt, { toolChoice: 'auto', requestContext })
  spin.stop()

  write(`\n${paint(c.green, '⏵ Storyteller')}\n`)
  let inThinking = false
  for await (const chunk of result.fullStream) {
    const record = recordFromJson(chunk)
    const payload = recordFromJson(record.payload)
    if (record.type === CHUNK.error) {
      write(`\n${paint(c.red, '✖ ' + (readString(payload.error) ?? 'stream error'))}\n`)
      return
    } else if (record.type === CHUNK.reasoningDelta) {
      if (!inThinking) { write(paint(c.gray, '\n  (thinking) ')); inThinking = true }
      write(paint(c.gray, readString(payload.text) ?? ''))
    } else if (record.type === CHUNK.textDelta) {
      if (inThinking) { write('\n'); inThinking = false }
      write(readString(payload.text) ?? '')
    } else if (record.type === CHUNK.toolCall) {
      write(`\n${paint(c.cyan, '⚙ ' + (readString(payload.toolName) ?? 'tool'))} ${paint(c.gray, '…')}\n`)
    } else if (record.type === CHUNK.toolResult) {
      const tool = readString(payload.toolName) ?? 'tool'
      write(`${paint(c.gray, '  ↳ ' + tool + ' done')}\n`)
    }
  }
  write('\n')
}

// ---------- interactive beat draft (the verdict HITL) ----------
async function runBeatDraft(rl: readline.Interface, sel: Selection, brief: string): Promise<void> {
  const workflow = createBeatDraftWorkflow(defaultBeatDraftDeps)
  void new Mastra({ workflows: { beatDraftWorkflow: workflow } })
  const spin = makeSpinner('drafting beat (plan → draft → critics)…')
  spin.start()
  const run = await workflow.createRun()
  let result = await run.start({
    inputData: { projectId: sel.projectId, episodeId: sel.episodeId, brief, characters: [], autoApprove: false },
  })
  spin.stop()

  while (result.status === 'suspended') {
    const payload = recordFromJson(result)
    const draft = readString(recordFromJson(payload.suspended).draft) ?? readString(payload.draft)
    if (draft) write(`\n${paint(c.bold, '— DRAFT —')}\n${draft}\n`)
    write(
      `\n${paint(c.yellow, 'Verdict')} — ${paint(c.green, '[a]pprove')} · ${paint(c.blue, '[r]evise')} · ${paint(c.red, '[k]ill')}: `
    )
    const ans = (await rl.question('')).trim().toLowerCase()
    const action =
      ans.startsWith('k') ? BeatDraftVerdictAction.Kill
      : ans.startsWith('r') ? BeatDraftVerdictAction.Revise
      : BeatDraftVerdictAction.Approve
    const spin2 = makeSpinner(`resuming (${action})…`)
    spin2.start()
    result = await run.resume({ step: VERDICT_STEP_ID, resumeData: { action } })
    spin2.stop()
  }

  if (result.status !== 'success') {
    write(`\n${paint(c.red, '✖ beat draft ' + result.status)}\n`)
    return
  }
  const out = beatDraftOutputSchema.parse(result.result)
  write(`\n${paint(c.bold, '=== FINAL DRAFT ===')}\n${out.finalDraft}\n`)
  write(`${paint(c.gray, `[${out.saved ? 'saved' : 'not saved'}${out.killed ? ' · killed' : ''}]`)}\n`)
}

function banner(sel: Selection): void {
  write(`\n${paint(c.magenta + c.bold, '  Storyteller REPL')}\n`)
  write(`  ${paint(c.gray, 'project')} ${sel.projectName}\n`)
  write(`  ${paint(c.gray, 'episode')} ${sel.episodeTitle || '(project level)'}\n`)
  write(
    `  ${paint(c.gray, 'commands')} ${paint(c.cyan, '/beat <brief>')} · ${paint(c.cyan, '/help')} · ${paint(c.cyan, '/exit')}\n\n`
  )
}

async function main(): Promise<void> {
  loadEnv()
  if (!process.env.DATABASE_URL || !hasLlmKey()) {
    write(paint(c.red, 'storyteller-repl: needs DATABASE_URL + an LLM key (MOONSHOT/ANTHROPIC/OPENAI).\n'))
    process.exit(1)
  }

  const rl = readline.createInterface({ input: stdin, output: stdout })
  const sel = await resolveSelection(rl)
  if (!sel) { rl.close(); process.exit(1) }

  const userId = process.env.STORYTELLER_USER_ID ?? ''
  const agent = await createStorytellerAgent()
  banner(sel)

  for (;;) {
    const line = (await rl.question(paint(c.magenta, 'storyteller › '))).trim()
    if (!line) continue
    if (line === '/exit' || line === '/quit') break
    if (line === '/help') {
      write(`  ${paint(c.cyan, '<message>')}      chat with the Storyteller (streams, uses tools)\n`)
      write(`  ${paint(c.cyan, '/beat <brief>')}  draft a beat with the editorial-verdict HITL\n`)
      write(`  ${paint(c.cyan, '/exit')}          quit\n\n`)
      continue
    }
    try {
      if (line.startsWith('/beat')) {
        const brief = line.slice('/beat'.length).trim()
        if (!brief) { write(paint(c.yellow, 'usage: /beat <what the beat must accomplish>\n')); continue }
        await runBeatDraft(rl, sel, brief)
      } else {
        await streamChat(agent, sel, line, userId)
      }
    } catch (error) {
      write(`\n${paint(c.red, '✖ ' + (error instanceof Error ? error.message : String(error)))}\n`)
    }
  }

  rl.close()
  write(paint(c.gray, '\nbye.\n'))
  process.exit(0)
}

void main()
