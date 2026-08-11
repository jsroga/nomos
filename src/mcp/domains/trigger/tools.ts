/**
 * Trigger.dev Run Management MCP Tools
 *
 * Tools for tracking and managing Trigger.dev task runs.
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { tilesService } from '@/shared/data/generation/tiles-service'
import { validateApiKey } from '../../core/auth'

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
    // Auth check optional for status? Let's enforce it for consistency
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    return tilesService.getRunStatus({ runId: inputData.runId })
  },
})

const cancelRun = createTool({
  id: 'cancel_run',
  description: 'Cancel a running Trigger.dev task.',
  inputSchema: z.object({
    runId: z.string().describe('The run ID to cancel'),
  }),
  execute: async (inputData) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    return tilesService.cancelRun(inputData.runId)
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
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

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
      const status = await tilesService.getRunStatus({ runId: inputData.runId })

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
    const finalStatus = await tilesService.getRunStatus({ runId: inputData.runId })
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
