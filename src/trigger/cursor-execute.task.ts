import { task, logger } from '@trigger.dev/sdk/v3'
import { runExecute, type RunExecuteOptions } from '@/shared/agent-kernel/cursor-runner'

/**
 * Trigger.dev v4 task that runs the Cursor SDK dark-factory execute loop.
 *
 * Kicked by Cursor Automations (cron / GitHub webhook) or called from other
 * tasks via `triggerAndWait`. Wraps `runExecute` so the same `/execute` loop
 * that runs in the IDE also runs headless on Trigger's runtime.
 *
 * Never use `client.defineJob` — v4 SDK only. Deploy with
 * `npm run trigger:deploy` (sets OTEL_TRACES_EXPORTER=none).
 */
export const cursorExecuteTask = task({
  id: 'cursor-execute',
  maxDuration: 1800, // 30 min — covers plan + build + verify + e2e
  retry: { maxAttempts: 2, minTimeoutInMs: 5000, maxTimeoutInMs: 30000, factor: 2 },
  run: async (payload: {
    /** Folder under src/domains/, or `domains-catalog` / `src-root`. */
    module: string;
    /** Cloud runtime: `owner/repo` to clone. Omit for local (needs CURSOR_API_KEY + checkout). */
    repo?: string;
    /** Open a real PR from the Fabro run branch (cloud only). */
    autoCreatePR?: boolean;
    /** Authorize unattended builds (Verification gate → [A] auto). */
    autoApprove?: boolean;
    /** Cursor model id. Default composer-2.5. */
    model?: string;
    /** Extra operator instructions appended to /execute. */
    notes?: string;
    /** Fabro environment id. Default execute-docker. */
    environment?: string;
  }) => {
    if (!payload?.module) throw new Error('cursor-execute: payload.module is required')

    const opts: RunExecuteOptions = {
      module: payload.module,
      repo: payload.repo,
      autoCreatePR: payload.autoCreatePR,
      autoApprove: payload.autoApprove,
      model: payload.model,
      notes: payload.notes,
      environment: payload.environment,
    }

    logger.info('Starting Cursor SDK execute loop', { module: payload.module, repo: payload.repo })

    const result = await runExecute(opts)
    const ok = result.status === 'finished'

    logger.info('Cursor SDK execute loop finished', { id: result.id, status: result.status, ok })

    // triggerAndWait callers must check `ok` before reading `output`.
    return {
      ok,
      id: result.id,
      status: result.status,
      result: result.result,
      error: result.error,
    }
  },
})
