'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { Plus, FolderOpen, ArrowRight, Loader2, LogOut, Trash2, Sparkles, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { AuroraBackground } from '@/components/ui/aurora-background'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'

export default function ProjectSelectionPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const user = useWorldStore(state => state.user)
  const projects = useWorldStore(state => state.projects)
  const fetchAllProjects = useWorldStore(state => state.fetchAllProjects)
  const createProject = useWorldStore(state => state.createProject)
  const deleteProject = useWorldStore(state => state.deleteProject)
  const setUser = useWorldStore(state => state.setUser)

  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)
      await fetchAllProjects()
      setIsLoading(false)
    }
    init()
  }, [])

  const handleSelectProject = (projectId: string) => {
    router.push(`/${projectId}/storyteller?bible=open`)
  }

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation() // Prevent entering the project
    const confirmed = await confirm({
      title: 'Delete Project',
      description: 'Are you sure you want to delete this project? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    })
    if (confirmed) {
      await deleteProject(projectId)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    setIsCreating(true)
    const id = await createProject(newProjectName, '')
    if (id) {
      router.push(`/${id}/storyteller?bible=open`)
    } else {
      setIsCreating(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-black text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <AuroraBackground>
      {/* Content Container - VS Code Style Split */}
      <div className="relative z-10 flex w-full h-full max-w-6xl mx-auto shadow-2xl rounded-xl overflow-hidden my-auto md:h-[85vh] border border-white/10 bg-black/40 backdrop-blur-xl ring-1 ring-white/10">
        <div className="flex w-full h-full overflow-hidden">

          {/* Left Sidebar - Project List */}
          <div className="w-full md:w-1/3 border-r border-white/10 flex flex-col bg-background/60 backdrop-blur-md">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                Projects
              </h1>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="hover:bg-white/10">
                  <LogOut size={18} />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {projects.map(project => (
                <div
                  key={project.id}
                  onClick={() => handleSelectProject(project.id)}
                  className="group flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer hover:bg-white/10 transition-all border border-transparent hover:border-primary/20"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-lg shadow-primary/10 shrink-0">
                      <FolderOpen size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate text-foreground group-hover:text-primary transition-colors">{project.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        // TODO: Implement generate functionality
                      }}
                      className="h-8 w-8 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
                      title="Generate"
                    >
                      <Sparkles size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        // TODO: Implement upload functionality
                      }}
                      className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10"
                      title="Upload"
                    >
                      <Upload size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteProject(e, project.id)}
                      className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete Project"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}

              {projects.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  No projects found.
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="p-4 border-t border-white/10 bg-black/40">
              {user && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-white/10">
                    <AvatarImage src={user.user_metadata.avatar_url} />
                    <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-white/90">{user.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - New Project / Welcome */}
          <div className="hidden md:flex flex-col justify-center items-center w-2/3 p-12 bg-white/5 relative overflow-hidden text-center">

            <div className="max-w-lg w-full space-y-8 relative z-10">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white drop-shadow-2xl">
                  Create New World
                </h2>
                <p className="text-white/60 text-xl font-light">
                  Start a new adventure. The canvas is yours.
                </p>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-6 relative">
                <div className="space-y-2 relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                  <input
                    type="text"
                    placeholder="Project Name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="relative w-full px-6 py-4 bg-black/80 border border-white/10 rounded-lg focus:outline-none text-xl placeholder:text-muted-foreground/50 transition-all text-white"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-14 text-lg font-bold shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all bg-white text-black hover:bg-white/90"
                  disabled={isCreating || !newProjectName.trim()}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                      Forging World...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-6 w-6" />
                      Create Poject
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>

        </div>
      </div>
      {ConfirmDialogComponent}
    </AuroraBackground>
  )
}
