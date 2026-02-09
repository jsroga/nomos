'use client'

import Link from 'next/link'
import { FileText, FlaskConical, Lock, Beaker, Cpu } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const INTERNAL_SECRET = 'okurwadiabel'

export default function InternalDocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isAuthed, setIsAuthed] = useState(false)
  const [inputKey, setInputKey] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Check both localStorage and cookie
    const storedKey = localStorage.getItem('internal_docs_key')
    const cookieMatch = document.cookie.match(/internal_docs_auth=([^;]+)/)
    const cookieKey = cookieMatch?.[1]

    if (storedKey === INTERNAL_SECRET || cookieKey === INTERNAL_SECRET) {
      setIsAuthed(true)
    }
    setChecking(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputKey === INTERNAL_SECRET) {
      // Set both localStorage and cookie (cookie for middleware)
      localStorage.setItem('internal_docs_key', inputKey)
      document.cookie = `internal_docs_auth=${inputKey}; path=/; max-age=86400; SameSite=Strict`
      setIsAuthed(true)
    }
  }

  // Internal-only nav items
  const internalNavItems = [
    { label: 'Overview', href: '/docs/internal', icon: Lock },
    { label: 'Agent Internals', href: '/docs/internal/agents', icon: Cpu },
    { label: 'Evaluation', href: '/docs/internal/evaluation', icon: FlaskConical },
    { label: 'E2E Testing', href: '/docs/internal/testing/e2e', icon: Beaker },
    { label: 'DeepEval Guide', href: '/docs/internal/testing/deepeval', icon: Beaker },
  ]

  // Plan Items (formerly Legacy)
  const planItems = [
    { label: 'Chrome Hero Plan', href: '/docs/internal/legacy/chrome-hero-plan', icon: FileText },
  ]

  if (checking) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-pulse text-white/20 font-mono">CHECKING_ACCESS...</div>
      </div>
    )
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full p-8"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-red-500/10 rounded-lg">
              <Lock className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-syne uppercase">Internal Docs</h1>
              <p className="text-white/40 text-sm font-mono">Restricted Access</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/40 text-xs font-mono uppercase mb-2">
                Access Key
              </label>
              <input
                type="password"
                value={inputKey}
                onChange={e => setInputKey(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="Enter secret key..."
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary font-bold py-3 rounded-lg transition-colors uppercase tracking-wider text-sm"
            >
              Authenticate
            </button>
          </form>

          <p className="text-white/20 text-xs font-mono text-center mt-6">
            Contact admin for access credentials
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      {/* Hide parent layout sidebar by overriding with our own full-page layout */}
      <style jsx global>{`
        /* Hide the parent docs layout when in internal docs */
        body > div > div > div.pt-16.flex > aside {
          display: none !important;
        }
        body > div > div > div.pt-16.flex > main {
          margin-left: 0 !important;
        }
      `}</style>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Internal Sidebar */}
        <aside className="fixed left-0 top-16 bottom-0 w-64 border-r border-red-500/10 bg-black/40 hidden lg:block overflow-y-auto z-40">
          <div className="p-6">
            <div className="mb-6 pb-4 border-b border-red-500/10">
              <span className="text-[10px] font-mono text-red-500 uppercase tracking-widest flex items-center gap-2">
                <Lock className="w-3 h-3" />
                INTERNAL DOCS
              </span>
            </div>

            {/* Internal-only items */}
            <nav className="space-y-1 mb-8">
              {internalNavItems.map(item => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                      isActive
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <item.icon
                      className={`w-4 h-4 ${isActive ? 'text-red-400' : 'text-white/30 group-hover:text-white/50'}`}
                    />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Plans Section */}
            <div className="mb-4 pb-4 border-b border-white/5">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3 block flex items-center gap-2">
                <FileText className="w-3 h-3" />
                PLANS
              </span>
              <nav className="space-y-1">
                {planItems.map(item => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 group ${
                        isActive
                          ? 'text-white bg-white/5'
                          : 'text-white/40 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span
                        className={`w-1 h-1 rounded-full ${isActive ? 'bg-white' : 'bg-white/10 group-hover:bg-white/20'}`}
                      />
                      <span className="text-xs font-medium">{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 p-6 md:p-12">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </>
  )
}
