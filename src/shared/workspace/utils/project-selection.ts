export {
  PROJECT_SELECTION_COMPOSE_HINT,
  PROJECT_SELECTION_COMPOSE_LABEL,
  PROJECT_SELECTION_CREATE_LABEL,
  PROJECT_SELECTION_DELETE_CANCEL,
  PROJECT_SELECTION_DELETE_CONFIRM,
  PROJECT_SELECTION_DELETE_DESCRIPTION,
  PROJECT_SELECTION_DELETE_TITLE,
  PROJECT_SELECTION_EMPTY,
  PROJECT_SELECTION_EMPTY_SEARCH,
  PROJECT_SELECTION_FOCUS_RING,
  PROJECT_SELECTION_FOCUS_RING_VISIBLE,
  PROJECT_SELECTION_GRID_STYLE,
  PROJECT_SELECTION_LOGO_ALT,
  PROJECT_SELECTION_LOGO_SRC,
  PROJECT_SELECTION_MONTH_HEADER_STYLE,
  PROJECT_SELECTION_NAME_PLACEHOLDER,
  PROJECT_SELECTION_PAGE_TITLE,
  PROJECT_SELECTION_SEARCH_PLACEHOLDER,
  PROJECT_SELECTION_SIGN_OUT,
  PROJECT_SORT_CYCLE,
  PROJECT_SORT_LABEL,
  ProjectDateCopy,
  ProjectDateLocale,
  ProjectDateTimeStyle,
  ProjectMetadataKey,
  ProjectSortMode,
} from '../constants/project-selection'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import {
  ProjectDateCopy,
  ProjectDateLocale,
  ProjectDateTimeStyle,
  ProjectMetadataKey,
} from '../constants/project-selection'

export function projectAvatarUrl(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined
  return readString(recordFromJson(metadata)[ProjectMetadataKey.AvatarUrl])
}

export function formatProjectCardDate(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)
  return `${day}.${month}.${year}`
}

export function formatProjectMonthLabel(iso: string | undefined): string {
  if (!iso) return ProjectDateCopy.Unknown
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ProjectDateCopy.Unknown
  return date
    .toLocaleString(ProjectDateLocale.EnUs, {
      month: ProjectDateTimeStyle.Month,
      year: ProjectDateTimeStyle.Year,
    })
    .toUpperCase()
}

export function projectMonthKey(iso: string | undefined): string {
  if (!iso) return ProjectDateCopy.UnknownKey
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ProjectDateCopy.UnknownKey
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
