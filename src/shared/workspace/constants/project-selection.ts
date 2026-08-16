/** Project selection page copy, sort modes, and date helpers. */

export const PROJECT_SELECTION_DELETE_TITLE = 'Delete Project'
export const PROJECT_SELECTION_DELETE_DESCRIPTION =
  'Are you sure you want to delete this project? This action cannot be undone.'
export const PROJECT_SELECTION_DELETE_CONFIRM = 'Delete'
export const PROJECT_SELECTION_DELETE_CANCEL = 'Cancel'

export const PROJECT_SELECTION_PAGE_TITLE = 'Projects'
export const PROJECT_SELECTION_SEARCH_PLACEHOLDER = 'Search projects…'
export const PROJECT_SELECTION_COMPOSE_LABEL = 'New project'
export const PROJECT_SELECTION_COMPOSE_HINT =
  'Name it, then open the workspace for this world.'
export const PROJECT_SELECTION_NAME_PLACEHOLDER = 'Project name'
export const PROJECT_SELECTION_CREATE_LABEL = 'Create'
export const PROJECT_SELECTION_SIGN_OUT = 'Sign out'
export const PROJECT_SELECTION_EMPTY = 'No projects yet. Create one to begin.'
export const PROJECT_SELECTION_EMPTY_SEARCH = 'No matching projects.'
export const PROJECT_SELECTION_LOGO_ALT = 'nomos'
export const PROJECT_SELECTION_LOGO_SRC = '/logo.png'

/** Indigo focus — use instead of outline-none alone or theme `ring-ring`. */
export const PROJECT_SELECTION_FOCUS_RING =
  'focus:outline-none focus:border-[hsl(235_88%_65%/0.65)] focus:shadow-[0_0_0_3px_hsl(235_88%_65%/0.2)]'

export const PROJECT_SELECTION_FOCUS_RING_VISIBLE =
  'focus-visible:outline-none focus-visible:border-[hsl(235_88%_65%/0.65)] focus-visible:shadow-[0_0_0_3px_hsl(235_88%_65%/0.2)]'

/** Inline — Tailwind content paths historically omitted `src/shared`. */
export const PROJECT_SELECTION_GRID_STYLE = {
  gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))',
} as const

export const PROJECT_SELECTION_MONTH_HEADER_STYLE = {
  gridColumn: '1 / -1',
  marginTop: '14px',
} as const

export function projectAvatarUrl(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined
  if (!('avatar_url' in metadata)) return undefined
  const value = metadata.avatar_url
  return typeof value === 'string' ? value : undefined
}

export enum ProjectSortMode {
  Newest = 'newest',
  Oldest = 'oldest',
  Name = 'name',
}

export const PROJECT_SORT_LABEL: Record<ProjectSortMode, string> = {
  [ProjectSortMode.Newest]: 'Newest',
  [ProjectSortMode.Oldest]: 'Oldest',
  [ProjectSortMode.Name]: 'Name',
}

export const PROJECT_SORT_CYCLE: readonly ProjectSortMode[] = [
  ProjectSortMode.Newest,
  ProjectSortMode.Oldest,
  ProjectSortMode.Name,
]

/** Compress ISO timestamps to `27.07.26` for card metadata. */
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
  if (!iso) return 'Unknown'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date
    .toLocaleString('en-US', { month: 'long', year: 'numeric' })
    .toUpperCase()
}

export function projectMonthKey(iso: string | undefined): string {
  if (!iso) return 'unknown'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'unknown'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
