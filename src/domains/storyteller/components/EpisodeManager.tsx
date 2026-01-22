import React, { useEffect, useState } from 'react'
import { Plus, Edit2, Film, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Episode {
  id: string
  title: string
  sequence: number
}

interface EpisodeManagerProps {
  projectId: string
  currentEpisodeId: string | null
  onEpisodeChange: (episodeId: string) => void
  onEpisodeTitleChange?: (title: string) => void
  isWorldBibleOpen?: boolean
}

export const EpisodeManager: React.FC<EpisodeManagerProps> = ({
  projectId,
  currentEpisodeId,
  onEpisodeChange,
  onEpisodeTitleChange,
  isWorldBibleOpen,
}) => {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Update parent with current episode title when episodes or currentEpisodeId changes
  useEffect(() => {
    if (currentEpisodeId && episodes.length > 0) {
      const current = episodes.find(ep => ep.id === currentEpisodeId)
      if (current && onEpisodeTitleChange) {
        onEpisodeTitleChange(current.title || 'Untitled Episode')
      }
    }
  }, [currentEpisodeId, episodes, onEpisodeTitleChange])

  // Listen for external title updates (e.g. from AI)
  useEffect(() => {
    const handleRemoteUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail && detail.title && currentEpisodeId) {
        setEpisodes(prev =>
          prev.map(ep => (ep.id === currentEpisodeId ? { ...ep, title: detail.title } : ep))
        )
      }
    }
    window.addEventListener('update_episode_premise', handleRemoteUpdate)
    return () => window.removeEventListener('update_episode_premise', handleRemoteUpdate)
  }, [currentEpisodeId])

  const handleRename = async (id: string, newTitle: string) => {
    setEditingId(null)
    if (!newTitle.trim()) return

    // Optimistic update
    setEpisodes(episodes.map(ep => (ep.id === id ? { ...ep, title: newTitle } : ep)))

    await fetch(`/api/storyteller/episodes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    })
  }

  useEffect(() => {
    if (projectId) {
      setIsLoading(true)
      fetch(`/api/storyteller/episodes?projectId=${projectId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setEpisodes(data)
            // Auto-select removed to keep Bible open
            // if (data.length > 0 && !currentEpisodeId) {
            //   onEpisodeChange(data[0].id)
            // }
          } else {
            console.error('Failed to fetch episodes:', data)
            setEpisodes([])
          }
        })
        .catch(err => {
          console.error('Error fetching episodes:', err)
          setEpisodes([])
        })
        .finally(() => setIsLoading(false))
    }
  }, [projectId]) // remove currentEpisodeId dependency to avoid loop, though onEpisodeChange is stable usually

  const handleCreate = async () => {
    const title = prompt('Episode Title:')
    if (!title) return

    const res = await fetch('/api/storyteller/episodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        title,
        sequence: episodes.length + 1,
      }),
    })
    const newEpisode = await res.json()
    setEpisodes([...episodes, newEpisode])
  }

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
          <span className="flex items-center gap-1.5">
            <Film size={12} />
            Episodes
          </span>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={handleCreate}>
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
                  className={`px-3 py-2 rounded text-sm cursor-pointer flex items-center justify-between group ${
                    currentEpisodeId === ep.id ? 'bg-primary/20 text-primary' : 'hover:bg-accent'
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
                  </div>
                </div>
              ))}
        </div>
      </div>
    </TooltipProvider>
  )
}
