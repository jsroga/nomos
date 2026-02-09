import { Plan, PlanItem, PlanItemStatus } from './schemas'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { withSpan } from './observability'

// ==========================================
// ABSTRACT PLANNER TOOL
// ==========================================
// Allows an agent to read, create, and update its own plan.
// It is "Abstract" because persistence (File vs DB) is injected.

export interface PlanPersistence {
  loadPlan(): Promise<Plan | null>
  savePlan(plan: Plan): Promise<void>
}

export const createPlannerTool = (persistence: PlanPersistence) => {
  return createTool({
    id: 'planner_tool',
    description:
      'Manage your high-level plan. use this to create tasks, mark them as done, or re-prioritize.',
    inputSchema: z.object({
      action: z.enum(['create_plan', 'read_plan', 'add_task', 'update_task_status', 'reflect']),
      goal: z.string().optional().describe("For 'create_plan' or high-level context"),
      title: z.string().optional().describe("For 'add_task': concise title"),
      taskId: z.string().optional().describe("For 'update_task_status'"),
      status: z.enum(['pending', 'in-progress', 'completed', 'failed', 'skipped']).optional(),
      feedback: z.string().optional().describe('Reason for update or reflection'),
    }),
    execute: async (input) => {
      return withSpan(
        crypto.randomUUID(),
        'PlannerTool.execute',
        async span => {
          let plan = await persistence.loadPlan()

          if (input.action === 'create_plan') {
            if (!input.goal) return { message: "Error: 'goal' is required to create a plan." }
            plan = {
              id: crypto.randomUUID(),
              goal: input.goal,
              items: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              version: 1,
            }
            await persistence.savePlan(plan)
            return { message: `Created new plan: "${input.goal}"` }
          }

          if (input.action === 'read_plan') {
            if (!plan) return { message: "No active plan found. Use 'create_plan' first." }
            return { message: JSON.stringify(plan, null, 2) }
          }

          if (!plan) return { message: 'No active plan found.' }

          if (input.action === 'add_task') {
            if (!input.title) return { message: "Error: 'title' is required for add_task." }
            const newId = (plan.items.length + 1).toString()
            const newItem: PlanItem = {
              id: newId,
              title: input.title,
              status: 'pending',
            }
            plan.items.push(newItem)
            await persistence.savePlan(plan)
            return { message: `Added task ${newId}: ${newItem.title}` }
          }

          if (input.action === 'update_task_status') {
            if (!input.taskId || !input.status)
              return { message: "Error: 'taskId' and 'status' required." }
            const task = plan.items.find(t => t.id === input.taskId)
            if (!task) return { message: `Error: Task ${input.taskId} not found.` }

            task.status = input.status as PlanItemStatus
            plan.updatedAt = new Date().toISOString()
            await persistence.savePlan(plan)
            return { message: `Updated task ${input.taskId} to ${input.status}.` }
          }

          return { message: 'Action not supported.' }
        },
        { ...input }
      )
    },
  })
}
