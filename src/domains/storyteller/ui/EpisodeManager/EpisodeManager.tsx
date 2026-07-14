import React, { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Plus, Edit2, Film, Trash2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/Tooltip'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { cachedFetch, clearFetchCache } from '@/shared/data/fetch-cache'
import { useConfirmDialog } from '@/components/ConfirmDialog'
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
  EPISODE_MANAGER_DELETE_CANCEL,
  EPISODE_MANAGER_DELETE_CONFIRM,
  EPISODE_MANAGER_DELETE_ERROR_LOG,
  EPISODE_MANAGER_DELETE_FAILED,
  EPISODE_MANAGER_DELETE_TITLE,
  EPISODE_MANAGER_FETCH_ERROR_LOG,
  EPISODE_MANAGER_FETCH_FAILED_LOG,
  EPISODE_MANAGER_UNTITLED,
  episodeDeleteDescription,
} from './constants/episode-manager'
import { ContentType } from '@/shared/data/constants/protocol'
import {
  StorytellerConfirmVariant,
  StorytellerHttpMethod,
  StorytellerQueryParam,
  StorytellerBibleQuery,
} from '@/domains/storyteller/core/storyteller-page-wire'

interface Episode {
  id: string
  title: string
  sequence: number
}

interface EpisodeManagerProps {
  projectId: string
  currentEpisodeId: string | null
  currentEpisodeTitle?: string | null
  onEpisodeChange: (episodeId: string) => void
  onEpisodeTitleChange?: (title: string) => void
  isWorldBibleOpen?: boolean
}

export const EpisodeManager: React.FC<EpisodeManagerProps> = React.memo(({
  projectId,
  currentEpisodeId,
  currentEpisodeTitle,
  onEpisodeChange,
  onEpisodeTitleChange,
  isWorldBibleOpen: _isWorldBibleOpen,
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newEpisodeTitle, setNewEpisodeTitle] = useState('')

  // Update parent with current episode title when episodes or currentEpisodeId changes
  // Note: onEpisodeTitleChange excluded from deps to prevent infinite loops
  useEffect(() => {
    if (currentEpisodeId && episodes.length > 0) {
      const current = episodes.find(ep => ep.id === currentEpisodeId)
      if (current && onEpisodeTitleChange) {
        onEpisodeTitleChange(current.title || EPISODE_MANAGER_UNTITLED)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEpisodeId, episodes])

  // Sync episode list when title changes via workspace state (e.g. premise panel save)
  useEffect(() => {
    if (!currentEpisodeTitle || !currentEpisodeId) return
    setEpisodes(prev =>
      prev.map(ep => (ep.id === currentEpisodeId ? { ...ep, title: currentEpisodeTitle } : ep))
    )
  }, [currentEpisodeTitle, currentEpisodeId])

  const handleRename = async (id: string, newTitle: string) => {
    setEditingId(null)
    if (!newTitle.trim()) return

    // Optimistic update
    setEpisodes(episodes.map(ep => (ep.id === id ? { ...ep, title: newTitle } : ep)))

    await fetch(`/api/storyteller/episodes/${id}`, {
      method: StorytellerHttpMethod.Patch,
      headers: { 'Content-Type': ContentType.Json },
      body: JSON.stringify({ title: newTitle }),
    })
  }

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await confirm({
      title: EPISODE_MANAGER_DELETE_TITLE,
      description: episodeDeleteDescription(title),
      confirmLabel: EPISODE_MANAGER_DELETE_CONFIRM,
      cancelLabel: EPISODE_MANAGER_DELETE_CANCEL,
      variant: StorytellerConfirmVariant.Destructive,
    })

    if (!confirmed) return

    // Optimistic update
    setEpisodes(prev => prev.filter(ep => ep.id !== id))

    // If we deleted the current episode, redirect to Story Bible (clear prompt)
    if (currentEpisodeId === id) {
      const params = new URLSearchParams(searchParams?.toString() || '')
      params.delete(StorytellerQueryParam.EpisodeId)
      params.set(StorytellerQueryParam.Bible, StorytellerBibleQuery.Open)
      router.push(`${pathname}?${params.toString()}`)
    } else {
      // If we deleted a non-active episode, no nav change needed
      // But if we want to be safe, we could check if any selection logic is needed
    }

    try {
      const res = await fetch(`/api/storyteller/episodes/${id}`, {
        method: StorytellerHttpMethod.Delete,
      })

      if (!res.ok) throw new Error(EPISODE_MANAGER_DELETE_FAILED)

      clearFetchCache(`episodes:${projectId}`)
    } catch (err) {
      console.error(EPISODE_MANAGER_DELETE_ERROR_LOG, err)
      // Revert on error (could fetch fresh list instead)
      // For now we just log, real app might want to show toast and revert state
    }
  }

  // Fetch episodes - using cachedFetch to prevent infinite loops on remount
  useEffect(() => {
    let isMounted = true
    if (!projectId) return

    setIsLoading(true)

    cachedFetch(
      `episodes:${projectId}`,
      async () => {
        const res = await fetch(`/api/storyteller/episodes?projectId=${projectId}`)
        return res.json()
      },
      {
        ttlMs: 60_000,
        validate: (value): value is unknown[] => Array.isArray(value),
      }
    )
      .then(data => {
        if (!isMounted) return
        if (Array.isArray(data)) {
          setEpisodes(data)
        } else {
          console.error(EPISODE_MANAGER_FETCH_FAILED_LOG, data)
          setEpisodes([])
        }
      })
      .catch(err => {
        console.error(EPISODE_MANAGER_FETCH_ERROR_LOG, err)
        if (isMounted) setEpisodes([])
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [projectId])

  // Open dialog instead of prompt
  const handleCreateClick = () => {
    setNewEpisodeTitle('')
    setIsCreateDialogOpen(true)
  }

  const handleCreateEpisode = async () => {
    if (!newEpisodeTitle.trim()) return

    const res = await fetch('/api/storyteller/episodes', {
      method: StorytellerHttpMethod.Post,
      headers: { 'Content-Type': ContentType.Json },
      body: JSON.stringify({
        projectId,
        title: newEpisodeTitle.trim(),
        sequence: episodes.length + 1,
      }),
    })
    const newEpisode = await res.json()
    // Clear cache so future fetches get updated data
    clearFetchCache(`episodes:${projectId}`)
    setEpisodes([...episodes, newEpisode])
    setIsCreateDialogOpen(false)
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2" id={TOUR_STEP_IDS.STORYTELLER_EPISODES}>
          <span className="flex items-center gap-1.5">
            <Film size={12} />
            Episodes
          </span>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 w-6 p-0"
                  onClick={handleCreateClick}
                >
                  <Plus size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add episode</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="space-y-1">
          {isLoading
            ? // Shimmer loading state
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-3 py-2 rounded text-sm flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground/30">#{i + 1}</span>
                <div
                  className="h-4 bg-muted/20 rounded animate-pulse flex-1"
                  style={{ maxWidth: `${100 + i * 30}px` }}
                />
              </div>
            ))
            : episodes.map(ep => (
              <div
                key={ep.id}
                className={`px-3 py-2 rounded text-sm cursor-pointer flex items-center justify-between group ${currentEpisodeId === ep.id ? 'bg-primary/20 text-primary' : 'hover:bg-accent'
                  }`}
                onClick={() => onEpisodeChange(ep.id)}
              >
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-xs font-mono opacity-50">#{ep.sequence}</span>
                  {editingId === ep.id ? (
                    <input
                      autoFocus
                      className="bg-transparent border-b-2 border-primary focus:outline-none w-full text-sm"
                      defaultValue={ep.title}
                      onBlur={e => handleRename(ep.id, e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(ep.id, e.currentTarget.value)
                      }}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      onDoubleClick={e => {
                        e.stopPropagation()
                        setEditingId(ep.id)
                      }}
                    >
                      {ep.title || 'Untitled Episode'}
                    </span>
                  )}
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0"
                        onClick={e => {
                          e.stopPropagation()
                          setEditingId(ep.id)
                        }}
                      >
                        <Edit2 size={12} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Rename episode</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        onClick={e => {
                          e.stopPropagation()
                          handleDelete(ep.id, ep.title)
                        }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete episode</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Create Episode Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>New Episode</DialogTitle>
            <DialogDescription>
              Enter a title for the new episode. You can change this later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <Input
                id="name"
                value={newEpisodeTitle}
                onChange={e => setNewEpisodeTitle(e.target.value)}
                placeholder="e.g. The Call to Adventure"
                className="col-span-3"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateEpisode()
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEpisode} disabled={!newEpisodeTitle.trim()}>
              Create Episode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {ConfirmDialogComponent}
    </>
  )
})

EpisodeManager.displayName = 'EpisodeManager'
