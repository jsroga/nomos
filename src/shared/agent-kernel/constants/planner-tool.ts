/** Planner tool ids, actions, statuses, and user-facing messages. */

export const PLANNER_TOOL_ID = 'planner_tool'

export const PLANNER_TOOL_DESCRIPTION =
  'Manage your high-level plan. use this to create tasks, mark them as done, or re-prioritize.'

export const PLANNER_FIELD_GOAL = "For 'create_plan' or high-level context"
export const PLANNER_FIELD_TITLE = "For 'add_task': concise title"
export const PLANNER_FIELD_TASK_ID = "For 'update_task_status'"
export const PLANNER_FIELD_FEEDBACK = 'Reason for update or reflection'

export const PLANNER_SPAN_NAME = 'PlannerTool.execute'

export enum PlannerAction {
  CreatePlan = 'create_plan',
  ReadPlan = 'read_plan',
  AddTask = 'add_task',
  UpdateTaskStatus = 'update_task_status',
  Reflect = 'reflect',
}

export enum PlannerTaskStatus {
  Pending = 'pending',
  InProgress = 'in-progress',
  Completed = 'completed',
  Failed = 'failed',
  Skipped = 'skipped',
}

export const PLANNER_ERROR_GOAL_REQUIRED = "Error: 'goal' is required to create a plan."
export const PLANNER_ERROR_NO_PLAN_CREATE_FIRST =
  "No active plan found. Use 'create_plan' first."
export const PLANNER_ERROR_NO_PLAN = 'No active plan found.'
export const PLANNER_ERROR_TITLE_REQUIRED = "Error: 'title' is required for add_task."
export const PLANNER_ERROR_TASK_STATUS_REQUIRED = "Error: 'taskId' and 'status' required."
export const PLANNER_ERROR_ACTION_UNSUPPORTED = 'Action not supported.'
