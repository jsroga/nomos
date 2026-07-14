import type { SeverityLevel } from '@/domains/storyteller/core/types/ConsistencyTypes'

export enum ConsistencyMessageAction {
  Kept = 'kept',
  Undone = 'undone',
}

export const CONSISTENCY_SEVERITY_TEXT_CLASS: Record<SeverityLevel, string> = {
  minor: 'text-yellow-500',
  major: 'text-orange-500',
  critical: 'text-red-500',
}

export const CONSISTENCY_DEFAULT_SEVERITY_CLASS = 'text-muted-foreground'
