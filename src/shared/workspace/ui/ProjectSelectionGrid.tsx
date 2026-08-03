'use client'

import { FolderOpen, Loader2, Trash2 } from 'lucide-react'
import {
  formatProjectCardDate,
  PROJECT_SELECTION_FOCUS_RING_VISIBLE,
  PROJECT_SELECTION_GRID_STYLE,
  PROJECT_SELECTION_MONTH_HEADER_STYLE,
} from '../constants/project-selection'
import type { ProjectMonthGroup } from '../lib/group-projects'
import type { WorkspaceProject } from '../types'

type ProjectSelectionGridProps = {
  groups: ProjectMonthGroup[]
  loadingProjectId: string | null
  emptyMessage: string
  onSelect: (projectId: string) => void
  onDelete: (e: React.MouseEvent, projectId: string) => void
}

function ProjectCard({
  project,
  loading,
  onSelect,
  onDelete,
}: {
  project: WorkspaceProject
  loading: boolean
  onSelect: (projectId: string) => void
  onDelete: (e: React.MouseEvent, projectId: string) => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(project.id)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(project.id)
        }
      }}
      className={`group flex h-[136px] w-full min-w-0 cursor-pointer flex-col justify-between rounded-xl border border-white/[0.09] bg-black/40 p-[18px] backdrop-blur-[24px] transition-all duration-[220ms] hover:-translate-y-[3px] hover:border-[hsl(235_88%_65%/0.55)] hover:shadow-[0_18px_40px_-22px_hsl(235_88%_65%/0.8)] ${PROJECT_SELECTION_FOCUS_RING_VISIBLE}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.05] text-white/50">
          {loading ? (
            <Loader2 size={15} className="animate-spin" aria-hidden />
          ) : (
            <FolderOpen size={15} aria-hidden />
          )}
        </div>
        <button
          type="button"
          onClick={e => onDelete(e, project.id)}
          disabled={loading}
          aria-label={`Delete ${project.name}`}
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/40 opacity-0 transition-all duration-[180ms] hover:bg-white/10 hover:text-white group-hover:opacity-100 group-focus-within:opacity-100 disabled:pointer-events-none ${PROJECT_SELECTION_FOCUS_RING_VISIBLE}`}
        >
          <Trash2 size={14} aria-hidden />
        </button>
      </div>

      <div className="min-w-0">
        <h3 className="truncate font-mono text-[14px] font-medium tracking-[-0.01em] text-[hsl(0_0%_98%)]">
          {project.name}
        </h3>
        <p className="mt-[5px] font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/30">
          {formatProjectCardDate(project.created_at)}
        </p>
      </div>
    </div>
  )
}

function MonthHeader({ label, isFirst }: { label: string; isFirst: boolean }) {
  return (
    <div
      className="flex w-full items-center gap-3.5"
      style={{
        ...PROJECT_SELECTION_MONTH_HEADER_STYLE,
        marginTop: isFirst ? 0 : PROJECT_SELECTION_MONTH_HEADER_STYLE.marginTop,
      }}
    >
      <h2 className="shrink-0 font-mono text-[10px] uppercase tracking-[0.24em] text-white/30">
        {label}
      </h2>
      <div aria-hidden className="h-px min-w-0 flex-1 bg-white/[0.07]" />
    </div>
  )
}

export function ProjectSelectionGrid({
  groups,
  loadingProjectId,
  emptyMessage,
  onSelect,
  onDelete,
}: ProjectSelectionGridProps) {
  if (groups.length === 0) {
    return (
      <p className="py-16 text-center font-sans text-[13.5px] text-white/40">{emptyMessage}</p>
    )
  }

  return (
    <div className="grid w-full gap-3.5" style={PROJECT_SELECTION_GRID_STYLE}>
      {groups.map((group, index) => (
        <div key={group.key} className="contents">
          <MonthHeader label={group.label} isFirst={index === 0} />
          {group.projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              loading={loadingProjectId === project.id}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
