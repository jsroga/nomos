'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link' // Added Link import
import { useRouter } from 'next/navigation'
import { useWorldStore } from '@/domains/world-building-toolkit'
import { Plus, FolderOpen, Loader2, LogOut, Trash2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/Avatar'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import {
  PROJECT_SELECTION_DELETE_CANCEL,
  PROJECT_SELECTION_DELETE_CONFIRM,
  PROJECT_SELECTION_DELETE_DESCRIPTION,
  PROJECT_SELECTION_DELETE_TITLE,
  PROJECT_SELECTION_SUBTITLES,
  PROJECT_SELECTION_TURBULENT_BG_CANVAS_ID,
  PROJECT_SELECTOR_BIBLE_QUERY,
} from './constants/project-selection-page'
import { DialogConfirmVariant } from '@/shared/data/constants/protocol'
import { TurbulentBackground } from '@/domains/marketing'
import { TURBULENT_BG_PROPS } from '@/shared/data/constants/visuals'
import { BleedingText } from '@/components/BleedingText'
import { motion } from 'framer-motion'

const SUBTITLES = PROJECT_SELECTION_SUBTITLES


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


  // Subtitle State
  const [subtitle, setSubtitle] = useState('')

  useEffect(() => {
    setSubtitle(SUBTITLES[Math.floor(Math.random() * SUBTITLES.length)])
  }, [])

  // Live Texture Bridge
  useEffect(() => {
    let rafId: number
    const updateTexture = () => {
      const bgCanvas = document.getElementById(PROJECT_SELECTION_TURBULENT_BG_CANVAS_ID)
      const renderer = window.__liquidGLRenderer__

      if (bgCanvas instanceof HTMLCanvasElement && renderer?._uploadTexture) {
        renderer._uploadTexture(bgCanvas)
      }
      rafId = requestAnimationFrame(updateTexture)
    }
    rafId = requestAnimationFrame(updateTexture)
    return () => cancelAnimationFrame(rafId)
  }, [])
  // ---------------------

  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
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
    setLoadingProjectId(projectId)
    router.push(`/${projectId}/storyteller?${PROJECT_SELECTOR_BIBLE_QUERY}`)
  }

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    const confirmed = await confirm({
      title: PROJECT_SELECTION_DELETE_TITLE,
      description: PROJECT_SELECTION_DELETE_DESCRIPTION,
      confirmLabel: PROJECT_SELECTION_DELETE_CONFIRM,
      cancelLabel: PROJECT_SELECTION_DELETE_CANCEL,
      variant: DialogConfirmVariant.Destructive,
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
      router.push(`/${id}/storyteller?${PROJECT_SELECTOR_BIBLE_QUERY}`)
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
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-black text-foreground relative z-50">
        <div className="flex flex-col items-center justify-center w-full h-full p-4 relative z-20">
          <div className="relative">
            <img
              alt="Loading..."
              className="w-12 h-12 opacity-80 animate-pulse drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
              src="/favicon.svg"
            />
            <div className="absolute inset-[-8px] rounded-full border-2 border-primary/30 border-t-white/80 animate-spin"></div>
          </div>
          <p className="mt-4 text-xs font-mono text-white/90 font-bold tracking-widest uppercase animate-pulse">
            Dreaming...
          </p>
        </div>
      </div>
    )
  }

  return (
    <TurbulentBackground
      {...TURBULENT_BG_PROPS}
    >
      <div className="relative z-10 w-full min-h-screen p-4 md:p-8 flex flex-col items-center justify-center gap-8">
        {/* Centered Logo */}
        <div className="z-50">
          <Link href="/">
            <Image
              src="/logo.svg"
              alt="Logo"
              width={237}
              height={59}
              className="w-[237px] h-auto opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
              priority
            />
          </Link>
        </div>

        {/* Main Content Container */}
        <div className="w-full max-w-6xl flex flex-col md:flex-row gap-6 md:h-[80vh]">
          {/* LEFT: Project List (Glass Panel) */}
          <div className="w-full md:w-1/3 flex flex-col bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-white/90">Projects</h1>
              </div>
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
                      {loadingProjectId === project.id ? (
                        <Loader2 size={20} className="animate-spin text-white" />
                      ) : (
                        <FolderOpen size={20} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate text-white/90 group-hover:text-white transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-xs text-white/50 truncate">
                        {new Date(project.created_at ?? '').toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={e => handleDeleteProject(e, project.id)}
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-red-400 hover:bg-red-400/10"
                    disabled={loadingProjectId === project.id}
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    title="Logout"
                    className="hover:bg-white/10 text-white/70"
                  >
                    <LogOut size={18} />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Create World (Simple Blur Card) */}
          <div className="w-full md:w-2/3 flex items-center justify-center">
            <div className="w-full h-full p-8 md:p-12 flex flex-col justify-center items-center text-center bg-[#0000005c] rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl">
              <div className="max-w-md w-full space-y-8">
                <div className="space-y-4 flex flex-col items-center relative group">
                  {/* Edgy Header */}
                  <div className="mb-8 relative z-10 flex flex-col items-center gap-2">
                    <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight font-syne leading-[0.9]">
                      Getting Started
                    </h2>
                    <div className="h-6">
                      {subtitle && (
                        <BleedingText
                          text={subtitle}
                          className="text-sm font-mono tracking-wide uppercase"
                          textColor="text-red-500/90"
                          particleColor="text-red-500"
                        />
                      )}
                    </div>
                    <div className="w-32 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-4" />
                  </div>
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]">
                    {/* <ThreeDIcon
                        type={iconType}
                        size={600}
                        scale={0.33}
                        glowScale={0.5}
                        // mouseRotation={0.25}
                        speed={0.1}
                      /> */}
                  </div>

                </div>

                <form onSubmit={handleCreateProject} className="space-y-6 w-full">
                  <div className="space-y-2 relative group w-full">
                    <div className="relative">
                      {/* Layer 1: Ambient Deep Glow (Always active, slow motion) */}
                      <motion.div
                        className="absolute inset-0 -z-20 rounded-xl opacity-20 blur-2xl"
                        style={{
                          background: 'linear-gradient(45deg, #4f46e5, #3b82f6, #8b5cf6, #4f46e5)',
                          backgroundSize: '400% 400%',
                        }}
                        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                      />

                      {/* Layer 2: Focus/Hover Intensity (Bright, scale pulse) */}
                      <motion.div
                        className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-30 group-focus-within:opacity-75 blur-md transition-all duration-500"
                        style={{ backgroundSize: '200% 200%' }}
                        animate={{
                          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                          scale: [0.98, 1.02, 0.98]
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: 'easeInOut'
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Name your world..."
                        value={newProjectName}
                        onChange={e => setNewProjectName(e.target.value)}
                        className="w-full px-6 py-4 bg-black border border-white/20 rounded-xl focus:outline-none focus:border-white/50 focus:bg-black text-xl placeholder:text-white/30 transition-all duration-300 text-white text-center relative z-10"
                      />
                    </div>
                  </div>
                  <div className="relative group">
                    {/* Button Glow Layer 1: Ambient */}
                    <motion.div
                      className="absolute inset-0 -z-20 rounded-xl opacity-20 blur-xl"
                      style={{
                        background: 'linear-gradient(45deg, #4f46e5, #3b82f6, #8b5cf6, #4f46e5)',
                        backgroundSize: '400% 400%',
                      }}
                      animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                      transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                    />

                    {/* Button Glow Layer 2: Hover Intensity */}
                    <motion.div
                      className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 blur-lg transition-all duration-300"
                      style={{ backgroundSize: '200% 200%' }}
                      animate={{
                        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                        scale: [0.95, 1.05, 0.95]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                    />
                    <Button
                      type="submit"
                      className="w-full h-14 text-lg font-bold shadow-xl hover:shadow-2xl transition-all bg-white text-black hover:bg-white/90 rounded-xl relative z-10"
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
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      {ConfirmDialogComponent}
    </TurbulentBackground >
  )
}
