'use client'

import Link from 'next/link'
import { Skull, FileText, Code, Shield } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const navItems = [
    { label: 'Getting Started', href: '/docs/getting-started', icon: FileText },
    { label: 'API Reference', href: '/docs', icon: Code },
    { label: 'MCP Server', href: '/docs/mcp', icon: Shield },
  ]

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-12 h-12 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <img
                  src="/logo.png"
                  alt="KUR"
                  className="w-full h-full object-contain brightness-0 invert"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black uppercase tracking-[0.2em] leading-none font-syne">
                  KUR
                </span>
                <span className="text-[9px] font-mono text-white/30 tracking-wider">
                  SYSTEM.v1.0.0
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <Link
                href="/app"
                className="text-white/60 hover:text-white transition-colors text-sm font-mono"
              >
                GO TO DASHBOARD_
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-16 flex">
        {/* Sidebar */}
        <aside className="fixed left-0 top-16 bottom-0 w-64 border-r border-white/5 bg-black/20 hidden lg:block overflow-y-auto">
          <div className="p-6">
            <div className="mb-8">
              <span className="text-[10px] font-mono text-primary uppercase tracking-widest leading-none">
                DOCUMENTATION
              </span>
            </div>
            <nav className="space-y-1">
              {navItems.map(item => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                      isActive
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <item.icon
                      className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-white/20 group-hover:text-white/40'}`}
                    />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
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
    </div>
  )
}
