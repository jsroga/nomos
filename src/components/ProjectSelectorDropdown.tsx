'use client'

import React, { useEffect, useState, useCallback } from 'react'
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
import { Liquid } from '@/domains/marketing/components/Liquid'
import { useLiquid } from '@/domains/marketing/context/LiquidContext'

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

  // Safe access to liquid context in case it's not wrapped (though we wrapped it in layout)
  let liquidOptions = {}
  try {
    const context = useLiquid()
    liquidOptions = context.liquidOptions
  } catch (e) {
    // Fallback if not in LiquidProvider
    console.warn('ProjectSelectorDropdown used outside LiquidProvider')
  }

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

  // Define loadProjects BEFORE using it in useEffect
  const loadProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading projects:', error)
    }
    if (data) setProjects(data)
  }, [supabase])

  useEffect(() => {
    if (user) {
      loadProjects()
    }
  }, [user, loadProjects])

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
          <Button variant="outline" className="h-8 min-w-[200px] justify-between gap-2 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <FolderOpen size={16} />
              <span className="truncate">{currentProject?.name || 'Select Project'}</span>
            </div>
            <ChevronDown size={16} className="ml-auto" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          sideOffset={8}
          collisionPadding={8}
          align="start"
          className="w-[250px] bg-transparent border-none p-0 shadow-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
        >
          <Liquid
            {...liquidOptions}
            className="rounded-md border border-white/10 bg-black/40 backdrop-blur-md"
          >
            <div className="p-1">
              {projects.length === 0 ? (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  No projects yet
                </div>
              ) : (
                projects.map(project => (
                  <DropdownMenuItem
                    key={project.id}
                    onClick={() => handleProjectChange(project.id)}
                    className="cursor-pointer hover:bg-white/10 focus:bg-white/10 text-white/90 focus:text-white"
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
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => setIsCreating(true)}
                className="cursor-pointer text-primary hover:text-primary hover:bg-primary/10 focus:bg-primary/10 focus:text-primary"
              >
                <Plus size={14} className="mr-2" />
                Create New Project
              </DropdownMenuItem>
            </div>
          </Liquid>
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
