import React, { useEffect, useState } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Episode {
  id: string
  title: string
  sequence: number
}

interface EpisodeManagerProps {
  projectId: string
  currentEpisodeId: string | null
  onEpisodeChange: (episodeId: string) => void
}

export const EpisodeManager: React.FC<EpisodeManagerProps> = ({
  projectId,
  currentEpisodeId,
  onEpisodeChange,
}) => {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

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
      fetch(`/api/storyteller/episodes?projectId=${projectId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setEpisodes(data)
            // Auto-select first episode if none selected
            if (data.length > 0 && !currentEpisodeId) {
              onEpisodeChange(data[0].id)
            }
          } else {
            console.error('Failed to fetch episodes:', data)
            setEpisodes([])
          }
        })
        .catch(err => {
          console.error('Error fetching episodes:', err)
          setEpisodes([])
        })
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
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
        <span>Episodes</span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-world-bible'))}
          >
            World Bible
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleCreate}>
            <Plus size={14} />
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {episodes.map(ep => (
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
                  className="bg-transparent border-b border-primary focus:outline-none w-full"
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
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={e => {
                  e.stopPropagation()
                  setEditingId(ep.id)
                }}
              >
                <Edit2 size={12} className="text-muted-foreground hover:text-foreground" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
