/**
 * Cursor SDK headless entry point for the dark-factory execute loop.
 *
 * Mirrors `.fabro/workflows/execute` but runs the Cursor agent harness
 * programmatically (CI / Trigger.dev / cloud automation). The agent uses the
 * same `/execute` skill, subagents, and `.fabro` prompts as the IDE flow; the
 * tools below expose the Fabro sandbox + verify script to it as in-process
 * custom tools (served via the SDK's built-in `custom-user-tools` MCP).
 *
 * Install: `npm i @cursor/sdk` (already a dependency). Run:
 *   CURSOR_API_KEY=... npx tsx src/shared/agent-kernel/cursor-runner.ts --module storyteller
 *   CURSOR_API_KEY=... npx tsx src/shared/agent-kernel/cursor-runner.ts --module storyteller --cloud --repo owner/repo
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { Agent, CursorAgentError, type RunResult, type SDKCustomTool } from '@cursor/sdk'

export type ExecuteRuntime = 'local' | 'cloud';

export interface RunExecuteOptions {
  /** Folder under src/domains/, or `domains-catalog` / `src-root`. */
  module: string;
  /** Local cwd (local runtime) — defaults to process.cwd(). */
  cwd?: string;
  /** Cloud repo `owner/repo` (cloud runtime). */
  repo?: string;
  /** Cloud: open a real PR from the run branch. */
  autoCreatePR?: boolean;
  /** Suppress reviewer-request notifications in CI. Default true. */
  skipReviewerRequest?: boolean;
  /** Cursor model id. Required for local; defaults to `composer-2.5`. */
  model?: string;
  /** Extra operator instructions appended to the /execute prompt. */
  notes?: string;
  /** Pass `--auto-approve` to the Fabro sandbox run (unattended builds). */
  autoApprove?: boolean;
  /** Fabro environment id. Default `execute-docker`. */
  environment?: string;
}

const DEFAULT_MODEL = 'composer-2.5'
const DEFAULT_ENVIRONMENT = 'execute-docker'

function sh(cmd: string, cwd: string): { ok: true; stdout: string } | { ok: false; stderr: string } {
  try {
    const stdout = execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 1024 * 1024 * 32 })
    return { ok: true, stdout }
  } catch (err) {
    const stderr = err instanceof Error ? (err as { stderr?: string }).stderr ?? err.message : String(err)
    return { ok: false, stderr }
  }
}

/** Custom tools exposed to the agent as the `custom-user-tools` MCP server. */
function buildCustomTools(cwd: string, opts: RunExecuteOptions): Record<string, SDKCustomTool> {
  const environment = opts.environment ?? DEFAULT_ENVIRONMENT

  const fabroRun: SDKCustomTool = {
    description:
      'Launch a Fabro execute workflow run for a module in the sandbox. Returns the run id and tail of the run output. Use for isolated dark-factory builds.',
    inputSchema: {
      type: 'object',
      properties: {
        module: { type: 'string', description: 'src/domains/<folder>, domains-catalog, or src-root' },
        environment: { type: 'string', description: 'Fabro environment id', default: environment },
        autoApprove: { type: 'boolean', description: 'Pass --auto-approve (unattended build). Default false.' },
      },
      required: ['module'],
    },
    execute: (args) => {
      const mod = String(args.module ?? '')
      const env = String(args.environment ?? environment)
      const approve = args.autoApprove ?? opts.autoApprove ? ' --auto-approve' : ''
      if (!mod) return { content: [{ type: 'text', text: 'fabro_run: module is required' }] }
      const r = sh(
        `fabro run .fabro/workflows/execute/workflow.toml -I module=${JSON.stringify(mod)} --environment ${env}${approve} --json`,
        cwd,
      )
      const text = r.ok ? r.stdout : `FABRO RUN FAILED:\n${r.stderr}`
      return { content: [{ type: 'text', text }] }
    },
  }

  const fabroVerify: SDKCustomTool = {
    description:
      'Run the module-scoped typecheck + lint gate (node scripts/fabro-verify.mjs). Reads the module from PLAN.md. Use before declaring work done; mirrors the Fabro verify stage.',
    inputSchema: { type: 'object', properties: {} },
    execute: () => {
      const r = sh('node scripts/fabro-verify.mjs', cwd)
      const text = r.ok ? 'fabro-verify passed\n' + r.stdout : 'fabro-verify FAILED\n' + r.stderr
      return { content: [{ type: 'text', text }] }
    },
  }

  const npmScript: SDKCustomTool = {
    description:
      'Run an npm script from package.json (e.g. "test:unit", "test:e2e", "eval", "typecheck", "lint"). Returns stdout/stderr.',
    inputSchema: {
      type: 'object',
      properties: { script: { type: 'string' }, args: { type: 'string', description: 'Extra args after --' } },
      required: ['script'],
    },
    execute: (args) => {
      const script = String(args.script ?? '')
      if (!script) return { content: [{ type: 'text', text: 'npm_script: script is required' }] }
      const extra = args.args ? ` -- ${String(args.args)}` : ''
      const r = sh(`npm run ${JSON.stringify(script)}${extra}`, cwd)
      const text = r.ok ? r.stdout : `npm run ${script} FAILED\n${r.stderr}`
      return { content: [{ type: 'text', text }] }
    },
  }

  const readArtifact: SDKCustomTool = {
    description:
      'Read a run artifact file (PLAN.md, DECISIONS.md, STRUCTURE.md, UX.md, SCREENSHOTS.md, RETRO.md, findings/assess.md). Returns the file contents or "missing".',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Repo-relative path to the artifact.' } },
      required: ['path'],
    },
    execute: (args) => {
      const rel = String(args.path ?? '')
      const abs = `${cwd}/${rel}`
      if (!existsSync(abs)) return { content: [{ type: 'text', text: `missing: ${rel}` }] }
      return { content: [{ type: 'text', text: readFileSync(abs, 'utf8') }] }
    },
  }

  return { fabro_run: fabroRun, fabro_verify: fabroVerify, npm_script: npmScript, read_artifact: readArtifact }
}

function buildPrompt(opts: RunExecuteOptions): string {
  const parts = [`/execute ${opts.module}`]
  if (opts.notes) parts.push(`\nOperator notes: ${opts.notes}`)
  if (opts.autoApprove) parts.push('\nOperator has authorized unattended builds (--auto-approve). At the Verification gate, proceed with [A] Approve & build automatically.')
  return parts.join('\n')
}

/** Run the dark-factory execute loop via a Cursor SDK agent. */
export async function runExecute(opts: RunExecuteOptions): Promise<RunResult> {
  const apiKey = process.env.CURSOR_API_KEY
  if (!apiKey) throw new Error('CURSOR_API_KEY is required (user key or team service-account key).')

  const model = { id: opts.model ?? process.env.CURSOR_MODEL ?? DEFAULT_MODEL }
  const prompt = buildPrompt(opts)
  const runtime: ExecuteRuntime = opts.repo ? 'cloud' : 'local'

  if (runtime === 'cloud') {
    if (!opts.repo) throw new Error('cloud runtime requires --repo owner/repo')
    const repoUrl = /^https?:\/\//.test(opts.repo) ? opts.repo : `https://github.com/${opts.repo}`
    await using agent = await Agent.create({
      apiKey,
      model,
      cloud: {
        repos: [{ url: repoUrl }],
        autoCreatePR: opts.autoCreatePR ?? false,
        skipReviewerRequest: opts.skipReviewerRequest ?? true,
      },
    })
    console.error(`[cursor-runner] cloud agent ${agent.agentId} repo=${opts.repo}`)
    const run = await agent.send(prompt)
    const result = await run.wait()
    return result
  }

  const cwd = opts.cwd ?? process.cwd()
  await using agent = await Agent.create({
    apiKey,
    model,
    local: {
      cwd,
      autoReview: true,
      settingSources: [],
      customTools: buildCustomTools(cwd, opts),
    },
  })
  console.error(`[cursor-runner] local agent ${agent.agentId} cwd=${cwd}`)
  const run = await agent.send(prompt)
  const result = await run.wait()
  return result
}

/** CLI entry: `npx tsx src/shared/agent-kernel/cursor-runner.ts --module <m> [--cloud --repo o/r]`. */
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const get = (k: string): string | undefined => {
    const i = args.indexOf(`--${k}`)
    return i >= 0 ? args[i + 1] : undefined
  }
  const flag = (k: string): boolean => args.includes(`--${k}`)

  const module = get('module')
  if (!module) {
    console.error('Usage: cursor-runner --module <domain-folder|domains-catalog|src-root> [--cloud --repo owner/repo] [--auto-approve] [--model id] [--notes ...]')
    process.exit(64)
  }

  try {
    const result = await runExecute({
      module,
      cwd: get('cwd'),
      repo: get('repo'),
      autoCreatePR: flag('auto-create-pr'),
      model: get('model'),
      notes: get('notes'),
      autoApprove: flag('auto-approve'),
      environment: get('environment'),
    })
    console.log(JSON.stringify({ id: result.id, status: result.status, result: result.result }, null, 2))
    process.exit(result.status === 'finished' ? 0 : 2)
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error(`startup failed: ${err.message}, retryable=${err.isRetryable}`)
      process.exit(1)
    }
    throw err
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
