'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { Plus, FolderOpen, ArrowRight, Loader2, LogOut, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'

// New Imports for Liquid UI
import { TurbulentBackground } from '@/domains/marketing/components/TurbulentBackground'
import { Liquid } from '@/domains/marketing/components/Liquid'

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

  // --- Liquid UI State ---
  const [zoom, setZoom] = useState(0.1)
  const [rotation, setRotation] = useState(3.33)
  const [speed, setSpeed] = useState(1.0)
  const [morphSpeed, setMorphSpeed] = useState(0.5)
  const [bgElement, setBgElement] = useState<HTMLDivElement | null>(null)

  // Liquid Card Settings (Optimized Defaults)
  const liquidOptions = {
    snapshot: bgElement,
    refraction: 0.064,
    bevelWidth: 0.042,
    bevelDepth: 2.00,
    intensity: 0.00,
    frost: 1.00,
    specular: true
  }

  // Live Texture Bridge
  useEffect(() => {
    let rafId: number
    const updateTexture = () => {
      const bgCanvas = document.getElementById('turbulent-bg-canvas') as HTMLCanvasElement
      // @ts-ignore
      const renderer = window.__liquidGLRenderer__

      if (bgCanvas && renderer && renderer._uploadTexture) {
        renderer._uploadTexture(bgCanvas)
      }
      rafId = requestAnimationFrame(updateTexture)
    }
    rafId = requestAnimationFrame(updateTexture)
    return () => cancelAnimationFrame(rafId)
  }, [])
  // ---------------------

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
    router.push(`/app/${projectId}/storyteller?bible=open`)
  }

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
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
      router.push(`/app/${id}/storyteller?bible=open`)
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
    <TurbulentBackground
      zoom={zoom}
      rotation={rotation}
      speed={speed}
      morphSpeed={morphSpeed}
      colorShift={0}
      saturation={0.65}
      brightness={2.39}
      contrast={1.32}
      hue={0}
      onRef={setBgElement}
    >
      <div className="relative z-10 w-full min-h-screen p-4 md:p-8 flex items-center justify-center">
        {/* Main Content Container */}
        <div className="w-full max-w-6xl flex flex-col md:flex-row gap-6 md:h-[80vh]">

          {/* LEFT: Project List (Glass Panel) */}
          <div className="w-full md:w-1/3 flex flex-col bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h1 className="text-xl font-bold tracking-tight text-white/90">
                Projects
              </h1>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="hover:bg-white/10 text-white/70">
                <LogOut size={18} />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {projects.map(project => (
                <div
                  key={project.id}
                  onClick={() => handleSelectProject(project.id)}
                  className="group flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer hover:bg-white/10 transition-all border border-transparent hover:border-white/20"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white/80 group-hover:bg-primary group-hover:text-white transition-colors shadow-lg shrink-0">
                      <FolderOpen size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate text-white/90 group-hover:text-white transition-colors">{project.name}</h3>
                      <p className="text-xs text-white/50 truncate">
                        {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDeleteProject(e, project.id)}
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-red-400 hover:bg-red-400/10"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
              {projects.length === 0 && (
                <div className="text-center py-10 text-white/40">
                  No projects yet. Create one to begin.
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="p-4 border-t border-white/10 bg-black/60">
              {user && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-white/10 ring-2 ring-white/5">
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

          {/* RIGHT: Create World (Liquid Card) */}
          <div className="w-full md:w-2/3 flex items-center justify-center">
            <Liquid speed={speed} {...liquidOptions}>
              <div className="w-full h-full p-8 md:p-12 flex flex-col justify-center items-center text-center bg-[#0000005c] rounded-2xl border border-white/10 shadow-2xl backdrop-blur-sm">
                <div className="max-w-md w-full space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white drop-shadow-lg font-syne">
                      Create Potential
                    </h2>
                    <p className="text-white/60 text-lg font-light leading-relaxed">
                      "To define is to limit." <br />
                      <span className="text-white/40 text-sm">- Oscar Wilde</span>
                    </p>
                  </div>

                  <form onSubmit={handleCreateProject} className="space-y-6 w-full">
                    <div className="space-y-2 relative group w-full">
                      <input
                        type="text"
                        placeholder="Name your world..."
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="w-full px-6 py-4 bg-black/40 border border-white/20 rounded-xl focus:outline-none focus:border-white/50 focus:bg-black/60 text-xl placeholder:text-white/30 transition-all text-white text-center"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-14 text-lg font-bold shadow-xl hover:shadow-2xl transition-all bg-white text-black hover:bg-white/90 rounded-xl"
                      disabled={isCreating || !newProjectName.trim()}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Forging...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-5 w-5" />
                          Create New World
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            </Liquid>
          </div>

        </div>
      </div>
      {ConfirmDialogComponent}
    </TurbulentBackground>
  )
}
