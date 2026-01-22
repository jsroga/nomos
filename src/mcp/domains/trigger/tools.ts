/**
 * Trigger.dev Run Management MCP Tools
 *
 * Tools for tracking and managing Trigger.dev task runs.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { MCPDomainModule, MCPServiceContext, LangSmithContext } from '../../core/types'
import { tilesService } from '@/services'

// ============================================
// TOOL DEFINITIONS
// ============================================

const tools: Tool[] = [
  {
    name: 'get_run_status',
    description:
      'Get the status of a Trigger.dev task run. Use this to track progress of async operations like tile generation, 3D model creation, or portrait generation.',
    inputSchema: {
      type: 'object',
      properties: {
        runId: {
          type: 'string',
          description: 'The run ID returned from a generation task (starts with run_)',
        },
      },
      required: ['runId'],
    },
  },
  {
    name: 'cancel_run',
    description: 'Cancel a running Trigger.dev task.',
    inputSchema: {
      type: 'object',
      properties: {
        runId: {
          type: 'string',
          description: 'The run ID to cancel',
        },
      },
      required: ['runId'],
    },
  },
  {
    name: 'wait_for_run',
    description:
      'Wait for a Trigger.dev run to complete and return the result. This will poll the run status until it completes, fails, or times out.',
    inputSchema: {
      type: 'object',
      properties: {
        runId: {
          type: 'string',
          description: 'The run ID to wait for',
        },
        timeoutSeconds: {
          type: 'integer',
          minimum: 1,
          maximum: 300,
          description: 'Maximum time to wait in seconds (default: 60, max: 300)',
        },
        pollIntervalSeconds: {
          type: 'integer',
          minimum: 1,
          maximum: 30,
          description: 'How often to check status in seconds (default: 2)',
        },
      },
      required: ['runId'],
    },
  },
]

// ============================================
// HANDLERS
// ============================================

const handlers: Record<
  string,
  (
    args: Record<string, any>,
    context: MCPServiceContext,
    langsmith: LangSmithContext
  ) => Promise<any>
> = {
  get_run_status: async args => {
    return tilesService.getRunStatus({ runId: args.runId })
  },

  cancel_run: async args => {
    return tilesService.cancelRun(args.runId)
  },

  wait_for_run: async args => {
    const timeoutSeconds = Math.min(args.timeoutSeconds || 60, 300)
    const pollIntervalSeconds = Math.min(args.pollIntervalSeconds || 2, 30)
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
      const status = await tilesService.getRunStatus({ runId: args.runId })

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
    const finalStatus = await tilesService.getRunStatus({ runId: args.runId })
    return {
      ...finalStatus,
      waitDurationMs: Date.now() - startTime,
      timedOut: true,
      message: `Timed out after ${timeoutSeconds} seconds. Run is still ${finalStatus.status}.`,
    }
  },
}

// ============================================
// EXPORT MODULE
// ============================================

const triggerModule: MCPDomainModule = {
  tools,
  handlers,
}

export default triggerModule
