import type { WorkspaceProject } from '../types'
import {
  formatProjectMonthLabel,
  ProjectSortMode,
  projectMonthKey,
} from '../constants/project-selection'

export type ProjectMonthGroup = {
  key: string
  label: string
  projects: WorkspaceProject[]
}

function compareByCreatedAt(a: WorkspaceProject, b: WorkspaceProject, ascending: boolean): number {
  const aTime = new Date(a.created_at ?? 0).getTime()
  const bTime = new Date(b.created_at ?? 0).getTime()
  return ascending ? aTime - bTime : bTime - aTime
}

export function filterAndSortProjects(
  projects: WorkspaceProject[],
  searchQuery: string,
  sortMode: ProjectSortMode,
): WorkspaceProject[] {
  const query = searchQuery.trim().toLowerCase()
  const filtered = query
    ? projects.filter(project => project.name.toLowerCase().includes(query))
    : projects

  const sorted = [...filtered]
  if (sortMode === ProjectSortMode.Name) {
    sorted.sort((a, b) => a.name.localeCompare(b.name))
  } else {
    sorted.sort((a, b) =>
      compareByCreatedAt(a, b, sortMode === ProjectSortMode.Oldest),
    )
  }
  return sorted
}

/** Group sorted projects by calendar month (preserves list order within groups). */
export function groupProjectsByMonth(projects: WorkspaceProject[]): ProjectMonthGroup[] {
  const groups: ProjectMonthGroup[] = []
  const indexByKey = new Map<string, number>()

  for (const project of projects) {
    const key = projectMonthKey(project.created_at)
    const existing = indexByKey.get(key)
    if (existing === undefined) {
      indexByKey.set(key, groups.length)
      groups.push({
        key,
        label: formatProjectMonthLabel(project.created_at),
        projects: [project],
      })
      continue
    }
    groups[existing]?.projects.push(project)
  }

  return groups
}
