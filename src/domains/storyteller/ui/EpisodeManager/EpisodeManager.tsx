import React, { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Plus, Film } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/Button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/Tooltip'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { ConfirmDialogVariant } from '@/components/ConfirmDialog/constants/confirm-dialog-copy'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/Dialog'
import { Input } from '@/components/Input'
import {
  createStorytellerEpisode,
  deleteStorytellerEpisode,
  patchStorytellerEpisode,
} from '@/domains/storyteller/core/io/storyteller.api'
import { storytellerKeys } from '@/domains/storyteller/core/io/storyteller.keys'
import { useEpisodes } from '@/domains/storyteller/state/queries/useEpisodes'
import { sortEpisodesForDisplay } from '@/domains/storyteller/state/utils/episode-list'
import type { PhaseId } from '@/domains/storyteller/core/types/enums'
import { EpisodeManagerRow } from './EpisodeManagerRow'
import {
  EPISODE_MANAGER_ADD,
  EPISODE_MANAGER_CREATE_CONFIRM,
  EPISODE_MANAGER_CREATE_DESCRIPTION,
  EPISODE_MANAGER_CREATE_INPUT_ID,
  EPISODE_MANAGER_CREATE_PLACEHOLDER,
  EPISODE_MANAGER_CREATE_TITLE,
  EPISODE_MANAGER_DELETE_CANCEL,
  EPISODE_MANAGER_DELETE_CONFIRM,
  EPISODE_MANAGER_DELETE_ERROR_LOG,
  EPISODE_MANAGER_DELETE_FAILED,
  EPISODE_MANAGER_DELETE_TITLE,
  EPISODE_MANAGER_EMPTY_HINT,
  EPISODE_MANAGER_LOADING_COUNT,
  EPISODE_MANAGER_NEW,
  EPISODE_MANAGER_RENAMED_TOAST,
  EpisodeManagerEmptyClass,
  episodeDeleteDescription,
  formatEpisodeIndex,
  formatEpisodesHeading,
} from './constants/episode-manager'
import { shouldPersistEpisodeRename } from './episode-title-action'
import { KeyboardKey } from '@/shared/data/constants/protocol'
import { readString } from '@/shared/data/json-guards'
import { StorytellerQueryParam } from '@/domains/storyteller/core/storyteller-page-wire'
import { getStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { storytellerSearchParams } from '@/domains/storyteller/state/utils/strip-bible-search-params'

interface Episode {
  id: string
  title: string
  sequence: number
}

interface EpisodeManagerProps {
  projectId: string
  currentEpisodeId: string | null
  currentEpisodeTitle?: string | null
  currentPhase: PhaseId
  isWorldBibleOpen?: boolean
  onEpisodeChange: (episodeId: string) => void
  onEpisodeTitleChange?: (title: string) => void
}

export const EpisodeManager: React.FC<EpisodeManagerProps> = React.memo(({
  projectId,
  currentEpisodeId,
  currentEpisodeTitle,
  currentPhase,
  isWorldBibleOpen = false,
  onEpisodeChange,
  onEpisodeTitleChange,
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const episodesQuery = useEpisodes(projectId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newEpisodeTitle, setNewEpisodeTitle] = useState('')

  const episodes = useMemo<Episode[]>(() => {
    const rows = episodesQuery.data ?? []
    return sortEpisodesForDisplay(
      rows
        .filter(row => row.id.length > 0)
        .map(row => ({
          id: row.id,
          title: row.title?.trim() ? row.title : '',
          sequence: row.sequence ?? 0,
        }))
    )
  }, [episodesQuery.data])

  const isLoading = episodesQuery.isPending && episodes.length === 0

  const invalidateEpisodes = () =>
    queryClient.invalidateQueries({ queryKey: storytellerKeys.episodes(projectId) })

  useEffect(() => {
    if (!currentEpisodeId || !onEpisodeTitleChange) return
    const current = episodes.find(ep => ep.id === currentEpisodeId)
    if (!current || !current.title || current.title === currentEpisodeTitle) return
    onEpisodeTitleChange(current.title)
  }, [currentEpisodeId, currentEpisodeTitle, episodes, onEpisodeTitleChange])

  const handleRename = async (id: string, newTitle: string) => {
    setEditingId(null)
    if (!shouldPersistEpisodeRename(newTitle)) return

    await patchStorytellerEpisode(id, { title: newTitle })
    toast.success(EPISODE_MANAGER_RENAMED_TOAST)
    void invalidateEpisodes()
  }

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await confirm({
      title: EPISODE_MANAGER_DELETE_TITLE,
      description: episodeDeleteDescription(title),
      confirmLabel: EPISODE_MANAGER_DELETE_CONFIRM,
      cancelLabel: EPISODE_MANAGER_DELETE_CANCEL,
      variant: ConfirmDialogVariant.Destructive,
    })

    if (!confirmed) return

    if (currentEpisodeId === id) {
      const params = storytellerSearchParams(searchParams)
      params.delete(StorytellerQueryParam.EpisodeId)
      router.push(`${pathname}?${params.toString()}`)
      getStorytellerUiStore().setWorldBibleOpen(true)
    }

    try {
      const ok = await deleteStorytellerEpisode(id)

      if (!ok) throw new Error(EPISODE_MANAGER_DELETE_FAILED)

      void invalidateEpisodes()
    } catch (err) {
      console.error(EPISODE_MANAGER_DELETE_ERROR_LOG, err)
    }
  }

  const handleCreateClick = () => {
    setNewEpisodeTitle('')
    setIsCreateDialogOpen(true)
  }

  const handleCreateEpisode = async () => {
    if (!newEpisodeTitle.trim()) return

    const newEpisode = await createStorytellerEpisode({
      projectId,
      title: newEpisodeTitle.trim(),
      sequence: episodes.length + 1,
    })
    if (readString(newEpisode.id)) {
      void invalidateEpisodes()
      setIsCreateDialogOpen(false)
    }
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2.5" id={TOUR_STEP_IDS.STORYTELLER_EPISODES}>
          <span className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-muted-foreground/80 flex items-center gap-2">
            <Film size={12} strokeWidth={1.7} />
            {formatEpisodesHeading(isLoading ? 1 : episodes.length)}
          </span>
          {!isLoading && episodes.length > 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 w-6 p-0 rounded-[7px] shadow-[inset_0_0_0_1px_hsl(var(--border)/0.8)] border-0 text-muted-foreground"
                  onClick={handleCreateClick}
                >
                  <Plus size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{EPISODE_MANAGER_ADD}</p>
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        <div className="flex flex-col gap-[3px]">
          {isLoading
            ? Array.from({ length: EPISODE_MANAGER_LOADING_COUNT }).map((_, i) => (
              <div key={i} className="px-3 py-2 rounded-[9px] text-sm flex items-center gap-2">
                <span className="text-[10.5px] font-mono text-muted-foreground/30">{formatEpisodeIndex(i + 1)}</span>
                <div
                  className="h-4 bg-muted/20 rounded animate-pulse flex-1"
                  style={{ maxWidth: `${100 + i * 30}px` }}
                />
              </div>
            ))
            : episodes.map((ep, index) => (
              <EpisodeManagerRow
                key={ep.id}
                episode={ep}
                displayIndex={index + 1}
                isSelected={!isWorldBibleOpen && currentEpisodeId === ep.id}
                editingId={editingId}
                draftTitle={draftTitle}
                currentPhase={currentPhase}
                onSelect={onEpisodeChange}
                onDraftTitleChange={setDraftTitle}
                onRename={(id, title) => {
                  void handleRename(id, title)
                }}
                onStartRename={(id, title) => {
                  setDraftTitle(title)
                  setEditingId(id)
                }}
                onDelete={(id, title) => {
                  void handleDelete(id, title)
                }}
              />
            ))}
          {!isLoading && episodes.length === 0 && (
            <div>
              <Button className={EpisodeManagerEmptyClass.Cta} onClick={handleCreateClick}>
                <Plus size={14} strokeWidth={1.9} />
                {EPISODE_MANAGER_NEW}
              </Button>
              <p className={EpisodeManagerEmptyClass.Hint}>{EPISODE_MANAGER_EMPTY_HINT}</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Episode Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{EPISODE_MANAGER_CREATE_TITLE}</DialogTitle>
            <DialogDescription>
              {EPISODE_MANAGER_CREATE_DESCRIPTION}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <Input
                id={EPISODE_MANAGER_CREATE_INPUT_ID}
                value={newEpisodeTitle}
                onChange={e => setNewEpisodeTitle(e.target.value)}
                placeholder={EPISODE_MANAGER_CREATE_PLACEHOLDER}
                className="col-span-3"
                autoFocus
                onKeyDown={e => {
                  if (e.key === KeyboardKey.Enter) void handleCreateEpisode()
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {EPISODE_MANAGER_DELETE_CANCEL}
            </Button>
            <Button onClick={handleCreateEpisode} disabled={!newEpisodeTitle.trim()}>
              {EPISODE_MANAGER_CREATE_CONFIRM}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {ConfirmDialogComponent}
    </>
  )
})

EpisodeManager.displayName = 'EpisodeManager'
