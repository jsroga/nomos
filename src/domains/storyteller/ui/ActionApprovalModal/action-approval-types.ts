import type { ActionChangeType } from '@/domains/storyteller/ui/ActionApprovalModal/constants/action-approval-display'

export interface ActionChange {
  path: string
  before: unknown
  after: unknown
  reason?: string
  changeType: ActionChangeType
  category: string
  friendlyName: string
  summary?: string
}
