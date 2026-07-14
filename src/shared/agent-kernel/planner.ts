import { Plan, PlanItem, PlanItemStatusSchema } from './schemas'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { withSpan } from '../observability'
import {
  PLANNER_ERROR_ACTION_UNSUPPORTED,
  PLANNER_ERROR_GOAL_REQUIRED,
  PLANNER_ERROR_NO_PLAN,
  PLANNER_ERROR_NO_PLAN_CREATE_FIRST,
  PLANNER_ERROR_TASK_STATUS_REQUIRED,
  PLANNER_ERROR_TITLE_REQUIRED,
  PLANNER_FIELD_FEEDBACK,
  PLANNER_FIELD_GOAL,
  PLANNER_FIELD_TASK_ID,
  PLANNER_FIELD_TITLE,
  PLANNER_SPAN_NAME,
  PLANNER_TOOL_DESCRIPTION,
  PLANNER_TOOL_ID,
  PlannerAction,
  PlannerTaskStatus,
} from '@/shared/agent-kernel/constants/planner-tool'

export interface PlanPersistence {
  loadPlan(): Promise<Plan | null>
  savePlan(plan: Plan): Promise<void>
}

export const createPlannerTool = (persistence: PlanPersistence) => {
  return createTool({
    id: PLANNER_TOOL_ID,
    description: PLANNER_TOOL_DESCRIPTION,
    inputSchema: z.object({
      action: z.enum([
        PlannerAction.CreatePlan,
        PlannerAction.ReadPlan,
        PlannerAction.AddTask,
        PlannerAction.UpdateTaskStatus,
        PlannerAction.Reflect,
      ]),
      goal: z.string().optional().describe(PLANNER_FIELD_GOAL),
      title: z.string().optional().describe(PLANNER_FIELD_TITLE),
      taskId: z.string().optional().describe(PLANNER_FIELD_TASK_ID),
      status: z
        .enum([
          PlannerTaskStatus.Pending,
          PlannerTaskStatus.InProgress,
          PlannerTaskStatus.Completed,
          PlannerTaskStatus.Failed,
          PlannerTaskStatus.Skipped,
        ])
        .optional(),
      feedback: z.string().optional().describe(PLANNER_FIELD_FEEDBACK),
    }),
    execute: async input => {
      return withSpan(
        crypto.randomUUID(),
        PLANNER_SPAN_NAME,
        async _span => {
          let plan = await persistence.loadPlan()

          if (input.action === PlannerAction.CreatePlan) {
            if (!input.goal) return { message: PLANNER_ERROR_GOAL_REQUIRED }
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

          if (input.action === PlannerAction.ReadPlan) {
            if (!plan) return { message: PLANNER_ERROR_NO_PLAN_CREATE_FIRST }
            return { message: JSON.stringify(plan, null, 2) }
          }

          if (!plan) return { message: PLANNER_ERROR_NO_PLAN }

          if (input.action === PlannerAction.AddTask) {
            if (!input.title) return { message: PLANNER_ERROR_TITLE_REQUIRED }
            const newId = (plan.items.length + 1).toString()
            const newItem: PlanItem = {
              id: newId,
              title: input.title,
              status: PlannerTaskStatus.Pending,
            }
            plan.items.push(newItem)
            await persistence.savePlan(plan)
            return { message: `Added task ${newId}: ${newItem.title}` }
          }

          if (input.action === PlannerAction.UpdateTaskStatus) {
            if (!input.taskId || !input.status) return { message: PLANNER_ERROR_TASK_STATUS_REQUIRED }
            const task = plan.items.find(t => t.id === input.taskId)
            if (!task) return { message: `Error: Task ${input.taskId} not found.` }

            const parsedStatus = PlanItemStatusSchema.safeParse(input.status)
            if (!parsedStatus.success) {
              return { message: `Error: invalid status '${input.status}'.` }
            }
            task.status = parsedStatus.data
            plan.updatedAt = new Date().toISOString()
            await persistence.savePlan(plan)
            return { message: `Updated task ${input.taskId} to ${input.status}.` }
          }

          return { message: PLANNER_ERROR_ACTION_UNSUPPORTED }
        },
        { ...input }
      )
    },
  })
}
