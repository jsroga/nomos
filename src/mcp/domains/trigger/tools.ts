/**
 * Trigger.dev Run Management MCP Tools
 *
 * Tools for tracking and managing Trigger.dev task runs.
 */

import { env } from '@/shared/config/env'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { tilesService } from '@/shared/data/generation/tiles-service'
import { validateApiKey } from '../../core/auth'
import { McpTriggerToolError } from './constants/tools'

// ============================================
// AUTH
// ============================================

/**
 * Resolve the MCP caller's user id. Every run-management tool needs it: a run
 * belongs to a tenant, so "the key is valid" is not enough to read or cancel one.
 */
async function requireMcpUser(): Promise<{ userId: string }> {
  const apiKey = env.MCP_API_KEY
  if (!apiKey) throw new Error(McpTriggerToolError.MissingApiKeyEnv)

  const authResult = await validateApiKey(apiKey)
  if (!authResult.valid || !authResult.userId) throw new Error(McpTriggerToolError.InvalidApiKey)

  return { userId: authResult.userId }
}

// ============================================
// TOOL DEFINITIONS
// ============================================

const getRunStatus = createTool({
  id: 'get_run_status',
  description:
    'Get the status of a Trigger.dev task run. Use this to track progress of async operations like tile generation, 3D model creation, or portrait generation.',
  inputSchema: z.object({
    runId: z.string().describe('The run ID returned from a generation task (starts with run_)'),
  }),
  execute: async (inputData) => {
    const authResult = await requireMcpUser()

    return tilesService.getRunStatus({ runId: inputData.runId, userId: authResult.userId })
  },
})

const cancelRun = createTool({
  id: 'cancel_run',
  description: 'Cancel a running Trigger.dev task.',
  inputSchema: z.object({
    runId: z.string().describe('The run ID to cancel'),
  }),
  execute: async (inputData) => {
    const authResult = await requireMcpUser()

    return tilesService.cancelRun(inputData.runId, authResult.userId)
  },
})

const waitForRun = createTool({
  id: 'wait_for_run',
  description:
    'Wait for a Trigger.dev run to complete and return the result. This will poll the run status until it completes, fails, or times out.',
  inputSchema: z.object({
    runId: z.string().describe('The run ID to wait for'),
    timeoutSeconds: z
      .number()
      .int()
      .min(1)
      .max(300)
      .optional()
      .describe('Maximum time to wait in seconds (default: 60, max: 300)'),
    pollIntervalSeconds: z
      .number()
      .int()
      .min(1)
      .max(30)
      .optional()
      .describe('How often to check status in seconds (default: 2)'),
  }),
  execute: async (inputData) => {
    const authResult = await requireMcpUser()

    const timeoutSeconds = Math.min(inputData.timeoutSeconds || 60, 300)
    const pollIntervalSeconds = Math.min(inputData.pollIntervalSeconds || 2, 30)
    const startTime = Date.now()
    const timeoutMs = timeoutSeconds * 1000
    const pollIntervalMs = pollIntervalSeconds * 1000

    // Terminal statuses
    const terminalStatuses = [
      'COMPLETED',
      'FAILED',
      'CANCELED',
      'TIMED_OUT',
      'CRASHED',
      'SYSTEM_FAILURE',
      'EXPIRED',
    ]

    while (Date.now() - startTime < timeoutMs) {
      const status = await tilesService.getRunStatus({
        runId: inputData.runId,
        userId: authResult.userId,
      })

      if (terminalStatuses.includes(status.status)) {
        return {
          ...status,
          waitDurationMs: Date.now() - startTime,
          timedOut: false,
        }
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
    }

    // Timeout reached
    const finalStatus = await tilesService.getRunStatus({
      runId: inputData.runId,
      userId: authResult.userId,
    })
    return {
      ...finalStatus,
      waitDurationMs: Date.now() - startTime,
      timedOut: true,
      message: `Timed out after ${timeoutSeconds} seconds. Run is still ${finalStatus.status}.`,
    }
  },
})

// Export tools
export const triggerTools = {
  getRunStatus,
  cancelRun,
  waitForRun,
}
