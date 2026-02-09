'use client'

import { Beaker, Lock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function InternalDocsPage() {
  return (
    <div className="max-w-none">
      {/* Header */}
      <div className="mb-12 border-b border-red-500/20 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/10 rounded-lg">
            <Lock className="w-6 h-6 text-red-500" />
          </div>
          <span className="font-mono text-xs text-red-500 uppercase tracking-widest">
            Internal Documentation
          </span>
        </div>
        <h1 className="text-5xl font-black uppercase tracking-tighter font-syne text-white m-0">
          Internal Docs
        </h1>
        <p className="text-white/60 text-xl mt-4 max-w-2xl leading-relaxed">
          Restricted documentation for internal development, debugging, and system internals.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/docs/internal/test"
          className="group p-6 bg-white/[0.02] border border-white/5 rounded-xl hover:border-red-500/30 hover:bg-red-500/5 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <Beaker className="w-5 h-5 text-red-500" />
            <span className="text-white font-bold">Test Page</span>
          </div>
          <p className="text-white/50 text-sm mb-4">
            Testing ground for internal features and components.
          </p>
          <div className="flex items-center gap-2 text-red-500 text-sm font-mono group-hover:gap-3 transition-all">
            <span>View</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-xl opacity-50">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-white font-bold">Database Schema</span>
            <span className="text-[10px] font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded">
              Coming Soon
            </span>
          </div>
          <p className="text-white/50 text-sm">Internal database schema documentation.</p>
        </div>

        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-xl opacity-50">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-white font-bold">Agent Internals</span>
            <span className="text-[10px] font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded">
              Coming Soon
            </span>
          </div>
          <p className="text-white/50 text-sm">Deep dive into agent implementation details.</p>
        </div>
      </div>

      {/* Warning */}
      <div className="mt-12 p-6 bg-red-500/5 border border-red-500/20 rounded-xl">
        <div className="flex items-start gap-4">
          <Lock className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-red-500 font-bold mb-2">Confidential Information</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              This section contains internal documentation not intended for public consumption. Do
              not share access credentials or contents outside the team.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
