export enum HumanLoopApprovalAction {
  Approve = 'approve',
}

export const HUMAN_LOOP_WAITING_REASON = 'Waiting for approval'
export const HUMAN_LOOP_SUSPENDED_FEEDBACK = 'Suspended for approval'
export const HUMAN_LOOP_NO_HANDLER_FEEDBACK = 'No suspension handler available'
