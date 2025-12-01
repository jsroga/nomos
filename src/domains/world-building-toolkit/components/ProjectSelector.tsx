/* eslint-disable */
import React, { useEffect, useState } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { supabase } from '@/infrastructure/storage/supabase'
import { Plus, FolderOpen } from 'lucide-react'

export const ProjectSelector: React.FC = () => {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectPrompt, setNewProjectPrompt] = useState('')

  const currentProject = useWorldStore(state => state.currentProject)
  const switchProject = useWorldStore(state => state.switchProject)
  const createProject = useWorldStore(state => state.createProject)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .order('created_at', { ascending: false })
    if (data) setProjects(data)
  }

  const handleCreate = async () => {
    if (!newProjectName) return
    const id = await createProject(newProjectName, newProjectPrompt)
    if (id) {
      setIsCreating(false)
      setNewProjectName('')
      setNewProjectPrompt('')
      loadProjects()
    }
  }

  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <FolderOpen size={16} />
          Projects
        </h2>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="p-1 hover:bg-accent rounded-md transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {isCreating && (
        <div className="mb-4 space-y-2 bg-accent/20 p-2 rounded-md">
          <input
            type="text"
            placeholder="Project Name"
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            className="w-full bg-background border border-input rounded px-2 py-1 text-sm"
          />
          <textarea
            placeholder="Project Prompt (Context)"
            value={newProjectPrompt}
            onChange={e => setNewProjectPrompt(e.target.value)}
            className="w-full bg-background border border-input rounded px-2 py-1 text-sm h-16 resize-none"
          />
          <button
            onClick={handleCreate}
            className="w-full bg-primary text-primary-foreground text-xs py-1 rounded hover:bg-primary/90"
          >
            Create Project
          </button>
        </div>
      )}

      <select
        value={currentProject?.id || ''}
        onChange={e => switchProject(e.target.value)}
        className="w-full bg-background border border-input rounded px-2 py-1 text-sm"
      >
        <option value="" disabled>
          Select a Project
        </option>
        {projects.map(p => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  )
}
