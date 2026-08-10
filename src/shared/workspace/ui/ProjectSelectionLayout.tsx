'use client'

import { ArrowUpDown, Loader2, Search } from 'lucide-react'
import {
  PROJECT_SELECTION_EMPTY,
  PROJECT_SELECTION_EMPTY_SEARCH,
  PROJECT_SELECTION_FOCUS_RING,
  PROJECT_SELECTION_FOCUS_RING_VISIBLE,
  PROJECT_SELECTION_PAGE_TITLE,
  PROJECT_SELECTION_SEARCH_PLACEHOLDER,
  PROJECT_SORT_LABEL,
  projectAvatarUrl,
} from '../constants/project-selection'
import { useProjectSelection } from '../hooks/useProjectSelection'
import { ProjectSelectionComposeBar } from './ProjectSelectionComposeBar'
import { ProjectSelectionGrid } from './ProjectSelectionGrid'
import { ProjectSelectionTopBar } from './ProjectSelectionTopBar'

export function ProjectSelectionLayout() {
  const {
    user,
    projectCount,
    monthGroups,
    visibleCount,
    isLoading,
    isCreating,
    newProjectName,
    setNewProjectName,
    searchQuery,
    setSearchQuery,
    sortMode,
    cycleSortMode,
    loadingProjectId,
    handleSelectProject,
    handleDeleteProject,
    handleCreateProject,
    handleLogout,
    ConfirmDialogComponent,
  } = useProjectSelection()

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[hsl(240_10%_3.9%)] text-[hsl(0_0%_98%)]">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(235_88%_65%)]" aria-hidden />
        <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
          Loading
        </p>
      </div>
    )
  }

  const emptyMessage =
    projectCount === 0 ? PROJECT_SELECTION_EMPTY : PROJECT_SELECTION_EMPTY_SEARCH

  return (
    <>
      <div className="relative z-10 flex h-full min-h-0 w-full flex-col overflow-y-auto bg-[hsl(240_10%_3.9%)] text-[hsl(0_0%_98%)]">
        <ProjectSelectionTopBar
          email={user?.email}
          avatarUrl={projectAvatarUrl(user?.user_metadata)}
          onSignOut={handleLogout}
        />

        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-7 px-6 pb-[72px] pt-9">
          <div className="flex items-end justify-between gap-8">
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-[22px] font-bold tracking-[-0.03em]">
                {PROJECT_SELECTION_PAGE_TITLE}
              </h1>
              <span className="rounded-[5px] border border-white/[0.14] px-[7px] py-[3px] font-mono text-[10px] tracking-[0.14em] text-white/45">
                {visibleCount === projectCount
                  ? projectCount
                  : `${visibleCount}/${projectCount}`}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search
                  size={15}
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/32"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={PROJECT_SELECTION_SEARCH_PLACEHOLDER}
                  className={`h-[38px] w-[260px] rounded-lg border border-white/10 bg-white/[0.04] py-0 pl-9 pr-3 font-sans text-[13.5px] text-[hsl(0_0%_98%)] placeholder:text-white/30 transition-[border-color,box-shadow] duration-[160ms] ${PROJECT_SELECTION_FOCUS_RING}`}
                />
              </div>

              <button
                type="button"
                onClick={cycleSortMode}
                className={`inline-flex h-[38px] items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.03] px-3.5 text-white/60 transition-colors duration-[180ms] hover:border-white/[0.28] hover:text-white ${PROJECT_SELECTION_FOCUS_RING_VISIBLE}`}
              >
                <ArrowUpDown size={13} aria-hidden />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
                  {PROJECT_SORT_LABEL[sortMode]}
                </span>
              </button>
            </div>
          </div>

          <ProjectSelectionComposeBar
            value={newProjectName}
            isCreating={isCreating}
            onChange={setNewProjectName}
            onSubmit={handleCreateProject}
          />

          <ProjectSelectionGrid
            groups={monthGroups}
            loadingProjectId={loadingProjectId}
            emptyMessage={emptyMessage}
            onSelect={handleSelectProject}
            onDelete={handleDeleteProject}
          />
        </div>
      </div>
      {ConfirmDialogComponent}
    </>
  )
}
