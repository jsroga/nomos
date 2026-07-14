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
import {
  CURSOR_RUNNER_DEFAULT_ENVIRONMENT,
  CURSOR_RUNNER_DEFAULT_MODEL,
  CursorRunnerCliFlag,
  CursorRunnerContentType,
  CursorRunnerEncoding,
  CursorRunnerEnvVar,
  CursorRunnerErrorMessage,
  CursorRunnerExecField,
  CursorRunnerFabroCommand,
  CursorRunnerFabroFlag,
  CursorRunnerJsonSchemaType,
  CursorRunnerPromptCopy,
  CursorRunnerRunStatus,
  CursorRunnerRuntime,
  CursorRunnerSchemaDescription,
  CursorRunnerSchemaProperty,
  CursorRunnerStartupLog,
  CursorRunnerStdio,
  CursorRunnerToolDescription,
  CursorRunnerToolMessage,
} from '@/shared/agent-kernel/constants/cursor-runner'

export type ExecuteRuntime = CursorRunnerRuntime

export interface RunExecuteOptions {
  /** Folder under src/domains/, or `domains-catalog` / `src-root`. */
  module: string
  /** Local cwd (local runtime) — defaults to process.cwd(). */
  cwd?: string
  /** Cloud repo `owner/repo` (cloud runtime). */
  repo?: string
  /** Cloud: open a real PR from the run branch. */
  autoCreatePR?: boolean
  /** Suppress reviewer-request notifications in CI. Default true. */
  skipReviewerRequest?: boolean
  /** Cursor model id. Required for local; defaults to `composer-2.5`. */
  model?: string
  /** Extra operator instructions appended to the /execute prompt. */
  notes?: string
  /** Pass `--auto-approve` to the Fabro sandbox run (unattended builds). */
  autoApprove?: boolean
  /** Fabro environment id. Default `execute-docker`. */
  environment?: string
}

function execErrorStderr(err: unknown): string {
  if (err instanceof Error) {
    if (CursorRunnerExecField.Stderr in err && typeof err.stderr === 'string') {
      return err.stderr
    }
    return err.message
  }
  return String(err)
}

function sh(cmd: string, cwd: string): { ok: true; stdout: string } | { ok: false; stderr: string } {
  try {
    const stdout = execSync(cmd, {
      cwd,
      encoding: CursorRunnerEncoding.Utf8,
      stdio: [CursorRunnerStdio.Pipe, CursorRunnerStdio.Pipe, CursorRunnerStdio.Pipe],
      maxBuffer: 1024 * 1024 * 32,
    })
    return { ok: true, stdout }
  } catch (err) {
    return { ok: false, stderr: execErrorStderr(err) }
  }
}

/** Custom tools exposed to the agent as the `custom-user-tools` MCP server. */
function buildCustomTools(cwd: string, opts: RunExecuteOptions): Record<string, SDKCustomTool> {
  const environment = opts.environment ?? CURSOR_RUNNER_DEFAULT_ENVIRONMENT

  const fabroRun: SDKCustomTool = {
    description: CursorRunnerToolDescription.FabroRun,
    inputSchema: {
      type: CursorRunnerJsonSchemaType.Object,
      properties: {
        module: {
          type: CursorRunnerJsonSchemaType.String,
          description: 'src/domains/<folder>, domains-catalog, or src-root',
        },
        environment: {
          type: CursorRunnerJsonSchemaType.String,
          description: CursorRunnerSchemaDescription.FabroEnvironmentId,
          default: environment,
        },
        autoApprove: {
          type: CursorRunnerJsonSchemaType.Boolean,
          description: CursorRunnerSchemaDescription.AutoApprove,
        },
      },
      required: [CursorRunnerSchemaProperty.Module],
    },
    execute: args => {
      const mod = String(args.module ?? '')
      const env = String(args.environment ?? environment)
      const approve =
        args.autoApprove ?? opts.autoApprove ? CursorRunnerFabroFlag.AutoApprove : ''
      if (!mod) {
        return {
          content: [
            {
              type: CursorRunnerContentType.Text,
              text: CursorRunnerToolMessage.FabroRunModuleRequired,
            },
          ],
        }
      }
      const r = sh(
        `fabro run .fabro/workflows/execute/workflow.toml -I module=${JSON.stringify(mod)} --environment ${env}${approve} --json`,
        cwd,
      )
      const text = r.ok ? r.stdout : `${CursorRunnerToolMessage.FabroRunFailed}${r.stderr}`
      return { content: [{ type: CursorRunnerContentType.Text, text }] }
    },
  }

  const fabroVerify: SDKCustomTool = {
    description: CursorRunnerToolDescription.FabroVerify,
    inputSchema: { type: CursorRunnerJsonSchemaType.Object, properties: {} },
    execute: () => {
      const r = sh(CursorRunnerFabroCommand.Verify, cwd)
      const text = r.ok
        ? `${CursorRunnerToolMessage.FabroVerifyPassed}${r.stdout}`
        : `${CursorRunnerToolMessage.FabroVerifyFailed}${r.stderr}`
      return { content: [{ type: CursorRunnerContentType.Text, text }] }
    },
  }

  const npmScript: SDKCustomTool = {
    description: CursorRunnerToolDescription.NpmScript,
    inputSchema: {
      type: CursorRunnerJsonSchemaType.Object,
      properties: {
        script: { type: CursorRunnerJsonSchemaType.String },
        args: {
          type: CursorRunnerJsonSchemaType.String,
          description: CursorRunnerSchemaDescription.NpmScriptArgs,
        },
      },
      required: [CursorRunnerSchemaProperty.Script],
    },
    execute: args => {
      const script = String(args.script ?? '')
      if (!script) {
        return {
          content: [
            {
              type: CursorRunnerContentType.Text,
              text: CursorRunnerToolMessage.NpmScriptRequired,
            },
          ],
        }
      }
      const extra = args.args ? ` -- ${String(args.args)}` : ''
      const r = sh(`npm run ${JSON.stringify(script)}${extra}`, cwd)
      const text = r.ok
        ? r.stdout
        : `npm run ${script}${CursorRunnerToolMessage.NpmScriptFailedSuffix}${r.stderr}`
      return { content: [{ type: CursorRunnerContentType.Text, text }] }
    },
  }

  const readArtifact: SDKCustomTool = {
    description: CursorRunnerToolDescription.ReadArtifact,
    inputSchema: {
      type: CursorRunnerJsonSchemaType.Object,
      properties: {
        path: {
          type: CursorRunnerJsonSchemaType.String,
          description: CursorRunnerSchemaDescription.ArtifactPath,
        },
      },
      required: [CursorRunnerSchemaProperty.Path],
    },
    execute: args => {
      const rel = String(args.path ?? '')
      const abs = `${cwd}/${rel}`
      if (!existsSync(abs)) {
        return {
          content: [
            {
              type: CursorRunnerContentType.Text,
              text: `${CursorRunnerToolMessage.MissingArtifactPrefix}${rel}`,
            },
          ],
        }
      }
      return {
        content: [
          {
            type: CursorRunnerContentType.Text,
            text: readFileSync(abs, CursorRunnerEncoding.Utf8),
          },
        ],
      }
    },
  }

  return { fabro_run: fabroRun, fabro_verify: fabroVerify, npm_script: npmScript, read_artifact: readArtifact }
}

function buildPrompt(opts: RunExecuteOptions): string {
  const parts = [`/execute ${opts.module}`]
  if (opts.notes) parts.push(`${CursorRunnerPromptCopy.OperatorNotesPrefix}${opts.notes}`)
  if (opts.autoApprove) parts.push(CursorRunnerPromptCopy.AutoApproveGate)
  return parts.join('\n')
}

/** Run the dark-factory execute loop via a Cursor SDK agent. */
export async function runExecute(opts: RunExecuteOptions): Promise<RunResult> {
  const apiKey = process.env[CursorRunnerEnvVar.CursorApiKey]
  if (!apiKey) throw new Error(CursorRunnerErrorMessage.ApiKeyRequired)

  const model = { id: opts.model ?? process.env[CursorRunnerEnvVar.CursorModel] ?? CURSOR_RUNNER_DEFAULT_MODEL }
  const prompt = buildPrompt(opts)
  const runtime: ExecuteRuntime = opts.repo ? CursorRunnerRuntime.Cloud : CursorRunnerRuntime.Local

  if (runtime === CursorRunnerRuntime.Cloud) {
    if (!opts.repo) throw new Error(CursorRunnerErrorMessage.CloudRepoRequired)
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

  const module = get(CursorRunnerCliFlag.Module)
  if (!module) {
    console.error(
      'Usage: cursor-runner --module <domain-folder|domains-catalog|src-root> [--cloud --repo owner/repo] [--auto-approve] [--model id] [--notes ...]',
    )
    process.exit(64)
  }

  try {
    const result = await runExecute({
      module,
      cwd: get(CursorRunnerCliFlag.Cwd),
      repo: get(CursorRunnerCliFlag.Repo),
      autoCreatePR: flag(CursorRunnerCliFlag.AutoCreatePr),
      model: get(CursorRunnerCliFlag.Model),
      notes: get(CursorRunnerCliFlag.Notes),
      autoApprove: flag(CursorRunnerCliFlag.AutoApprove),
      environment: get(CursorRunnerCliFlag.Environment),
    })
    console.log(JSON.stringify({ id: result.id, status: result.status, result: result.result }, null, 2))
    process.exit(result.status === CursorRunnerRunStatus.Finished ? 0 : 2)
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error(
        `${CursorRunnerStartupLog.StartupFailedPrefix}${err.message}${CursorRunnerStartupLog.RetryableSuffix}${err.isRetryable}`,
      )
      process.exit(1)
    }
    throw err
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
