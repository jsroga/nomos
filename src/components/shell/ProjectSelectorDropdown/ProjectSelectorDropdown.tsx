'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import { useAuthStore } from '@/shared/auth/useAuthStore'
import { ChevronDown, Plus, FolderOpen, Check } from 'lucide-react'
import { Button } from '@/components/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/DropdownMenu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/Dialog'
import { Input } from '@/components/Input'
import { Textarea } from '@/components/Textarea'
import {
  AppRouteSegment,
  DefaultWorkspaceModule,
  PROJECT_SELECTOR_BIBLE_QUERY,
  PROJECT_SELECTOR_CANCEL_LABEL,
  PROJECT_SELECTOR_CREATE_BUTTON,
  PROJECT_SELECTOR_CREATE_LABEL,
  PROJECT_SELECTOR_DIALOG_TITLE,
  PROJECT_SELECTOR_EMPTY_LABEL,
  PROJECT_SELECTOR_NAME_LABEL,
  PROJECT_SELECTOR_NAME_PLACEHOLDER,
  PROJECT_SELECTOR_NO_PROJECTS,
  PROJECT_SELECTOR_PROMPT_LABEL,
  PROJECT_SELECTOR_PROMPT_PLACEHOLDER,
} from '@/components/shell/ProjectSelectorDropdown/constants/project-selector-dropdown'

export function ProjectSelectorDropdown() {
  const router = useRouter()
  const pathname = usePathname()

  const [isCreating, setIsCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectPrompt, setNewProjectPrompt] = useState('')

  const currentProject = useWorkspaceProjectStore(state => state.currentProject)
  const projects = useWorkspaceProjectStore(state => state.projects)
  const fetchAllProjects = useWorkspaceProjectStore(state => state.fetchAllProjects)
  const createProject = useWorkspaceProjectStore(state => state.createProject)
  const user = useAuthStore(state => state.user)

  // Extract current module from pathname (e.g., /project-id/storyteller -> storyteller)
  // Pathname: /:projectId/:module...
  const getNextUrl = (nextProjectId: string) => {
    if (!pathname) return `/${nextProjectId}/${DefaultWorkspaceModule.Storyteller}?${PROJECT_SELECTOR_BIBLE_QUERY}`

    const parts = pathname.split('/').filter(Boolean)
    // parts[0] is app, parts[1] is projectId, parts[2] is module
    // But we need to be careful if we are already in /app/

    // Assuming the structure is /app/[projectId]/[module]
    // If we are simply in /app, parts might be ['app']

    // Let's just hardcode the structure we want: /app/[projectId]/[module]

    let module: string = DefaultWorkspaceModule.Storyteller

    // Check if we can extract a module from current path
    // If path is /app/123/storyteller -> parts=['app', '123', 'storyteller']
    // If path is /app/123/world -> parts=['app', '123', 'world']
    if (parts.length >= 3 && parts[0] === AppRouteSegment.App) {
      module = parts[2]
    }

    return `/${nextProjectId}/${module}`
  }

  useEffect(() => {
    if (user) {
      void fetchAllProjects()
    }
  }, [user, fetchAllProjects])

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
      // Navigate to the new project with bible open
      router.push(`/${id}/${DefaultWorkspaceModule.Storyteller}?${PROJECT_SELECTOR_BIBLE_QUERY}`)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-8 min-w-[200px] justify-between gap-2 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <FolderOpen size={16} />
              <span className="truncate">{currentProject?.name || PROJECT_SELECTOR_EMPTY_LABEL}</span>
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
          <div className="rounded-md border border-white/10 bg-black/60 backdrop-blur-xl shadow-lg">
            <div className="p-1">
              {projects.length === 0 ? (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  {PROJECT_SELECTOR_NO_PROJECTS}
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
                {PROJECT_SELECTOR_CREATE_LABEL}
              </DropdownMenuItem>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{PROJECT_SELECTOR_DIALOG_TITLE}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{PROJECT_SELECTOR_NAME_LABEL}</label>
              <Input
                placeholder={PROJECT_SELECTOR_NAME_PLACEHOLDER}
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{PROJECT_SELECTOR_PROMPT_LABEL}</label>
              <Textarea
                placeholder={PROJECT_SELECTOR_PROMPT_PLACEHOLDER}
                value={newProjectPrompt}
                onChange={e => setNewProjectPrompt(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              {PROJECT_SELECTOR_CANCEL_LABEL}
            </Button>
            <Button onClick={handleCreate} disabled={!newProjectName}>
              {PROJECT_SELECTOR_CREATE_BUTTON}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
