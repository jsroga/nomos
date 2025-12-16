'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ChevronDown, Plus, FolderOpen, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function ProjectSelectorDropdown() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClientComponentClient()

  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectPrompt, setNewProjectPrompt] = useState('')

  const currentProject = useWorldStore(state => state.currentProject)
  const createProject = useWorldStore(state => state.createProject)
  const user = useWorldStore(state => state.user)

  const params = useParams()
  const currentProjectId = params?.projectId as string

  // Extract current module from pathname (e.g., /project-id/storyteller -> storyteller)
  // Pathname: /:projectId/:module...
  const getNextUrl = (nextProjectId: string) => {
    if (!pathname) return `/app/${nextProjectId}/storyteller?bible=open`

    const parts = pathname.split('/').filter(Boolean)
    // parts[0] is app, parts[1] is projectId, parts[2] is module
    // But we need to be careful if we are already in /app/

    // Assuming the structure is /app/[projectId]/[module]
    // If we are simply in /app, parts might be ['app']

    // Let's just hardcode the structure we want: /app/[projectId]/[module]

    let module = 'storyteller'

    // Check if we can extract a module from current path
    // If path is /app/123/storyteller -> parts=['app', '123', 'storyteller']
    // If path is /app/123/world -> parts=['app', '123', 'world']
    if (parts.length >= 3 && parts[0] === 'app') {
      module = parts[2]
    }

    return `/app/${nextProjectId}/${module}`
  }

  useEffect(() => {
    if (user) {
      loadProjects()
    }
  }, [user])

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading projects:', error)
    }
    if (data) setProjects(data)
  }

  const handleProjectChange = (projectId: string) => {
    router.push(getNextUrl(projectId))
  }

  const handleCreate = async () => {
    if (!newProjectName) return
    const id = await createProject(newProjectName, newProjectPrompt)
    if (id) {
      setIsCreating(false)
      setNewProjectName('')
      setNewProjectPrompt('')
      await loadProjects()
      // Navigate to the new project with bible open
      router.push(`/app/${id}/storyteller?bible=open`)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[200px] justify-between gap-2">
            <div className="flex items-center gap-2">
              <FolderOpen size={16} />
              <span className="truncate">{currentProject?.name || 'Select Project'}</span>
            </div>
            <ChevronDown size={16} className="ml-auto" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[250px]">
          {projects.length === 0 ? (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              No projects yet
            </div>
          ) : (
            projects.map(project => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => handleProjectChange(project.id)}
                className="cursor-pointer"
              >
                {currentProject?.id === project.id ? (
                  <Check size={14} className="mr-2 text-primary" />
                ) : (
                  <FolderOpen size={14} className="mr-2" />
                )}
                {project.name}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsCreating(true)}
            className="cursor-pointer text-primary"
          >
            <Plus size={14} className="mr-2" />
            Create New Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project Name</label>
              <Input
                placeholder="My Fantasy World"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Master Prompt (Optional)</label>
              <Textarea
                placeholder="Describe your world context..."
                value={newProjectPrompt}
                onChange={e => setNewProjectPrompt(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newProjectName}>
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
