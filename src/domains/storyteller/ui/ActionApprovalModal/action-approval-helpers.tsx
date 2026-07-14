import React from 'react'
import {
  AlertCircle,
  Edit3,
  FileText,
  Globe,
  Minus,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react'
import { cn } from '@/shared/data/utils'
import { recordFromJson } from '@/shared/data/deep-merge'
import {
  ActionChangeType,
  CHANGE_TYPE_BADGE_COPY,
  EMPTY_VALUE_LABEL,
  FIELD_NAME_CAMEL_SPLIT,
  FIELD_NAME_SPACE_PREFIX,
  FIELD_NAME_UNDERSCORE,
  FIELD_NAME_WORD_CAP,
} from '@/domains/storyteller/ui/ActionApprovalModal/constants/action-approval-display'

export function formatFieldName(name: string): string {
  return name
    .replace(FIELD_NAME_CAMEL_SPLIT, FIELD_NAME_SPACE_PREFIX)
    .replace(FIELD_NAME_UNDERSCORE, ' ')
    .trim()
    .replace(FIELD_NAME_WORD_CAP, character => character.toUpperCase())
}

export function formatActionType(type: string): string {
  return formatFieldName(type)
}

export function formatJSON(value: unknown): string {
  if (value === null || value === undefined) {
    return EMPTY_VALUE_LABEL
  }
  if (typeof value === 'string') {
    return value
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function isSimpleValue(value: unknown): boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

export function formatSimpleValue(value: unknown): string {
  if (value === null || value === undefined) return EMPTY_VALUE_LABEL
  if (typeof value === 'string') return value.length > 50 ? `${value.slice(0, 50)}...` : value
  return String(value)
}

export function arrayItemLabel(item: unknown): string {
  if (typeof item === 'object' && item !== null) {
    const record = recordFromJson(item)
    const name = record.name ?? record.title
    return typeof name === 'string' ? name : `${JSON.stringify(item).slice(0, 50)}`
  }
  return String(item)
}

export const ChangeTypeIcon: React.FC<{ type: ActionChangeType }> = ({ type }) => {
  switch (type) {
    case ActionChangeType.ADD:
      return (
        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
          <Plus className="w-3.5 h-3.5 text-green-400" />
        </div>
      )
    case ActionChangeType.MODIFY:
      return (
        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
          <Edit3 className="w-3.5 h-3.5 text-blue-400" />
        </div>
      )
    case ActionChangeType.REMOVE:
      return (
        <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
          <Minus className="w-3.5 h-3.5 text-red-400" />
        </div>
      )
  }
}

export const ChangeTypeBadge: React.FC<{ type: ActionChangeType }> = ({ type }) => {
  const config = CHANGE_TYPE_BADGE_COPY[type]
  return (
    <span className={cn('text-[10px] px-1.5 py-0.5 rounded', config.className)}>
      {config.label}
    </span>
  )
}

export function getCategoryIcon(category: string) {
  const icons: Record<string, React.ReactNode> = {
    Characters: <Users className="w-4 h-4 text-purple-400" />,
    'World Rules': <Globe className="w-4 h-4 text-blue-400" />,
    Story: <FileText className="w-4 h-4 text-orange-400" />,
    Premise: <Sparkles className="w-4 h-4 text-primary" />,
  }
  return icons[category] || <FileText className="w-4 h-4 text-muted-foreground" />
}

export const ReasonLine: React.FC<{ reason?: string }> = ({ reason }) => {
  if (!reason) return null
  return (
    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
      <AlertCircle className="w-3 h-3" />
      {reason}
    </div>
  )
}
