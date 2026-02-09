'use client'

import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion } from 'framer-motion'
import { Rocket, Terminal } from 'lucide-react'

export default function GettingStartedPage() {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/docs/getting-started')
        if (!res.ok) throw new Error('Not found')
        const data = await res.text()
        // Retrieve content but maybe strip out some parts if needed
        // For now, raw readme is fine
        setContent(data)
      } catch (err) {
        console.error(err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchDoc()
  }, [])

  if (loading) {
    return <div className="animate-pulse text-white/20 font-mono">LOADING_INSTRUCTIONS...</div>
  }

  if (error) {
    return (
      <div className="border border-red-500/20 bg-red-500/5 p-8 rounded-xl">
        <h1 className="text-red-500 font-black uppercase tracking-tighter font-syne mb-2">
          DOCUMENT_NOT_FOUND
        </h1>
        <p className="text-white/40 font-mono text-sm underlineDecoration">
          The getting started guide could not be retrieved.
        </p>
      </div>
    )
  }

  return (
    <div className="prose prose-invert prose-primary max-w-none">
      {/* Header Banner */}
      <div className="mb-12 border-b border-white/10 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Rocket className="w-6 h-6 text-primary" />
          </div>
          <span className="font-mono text-xs text-primary uppercase tracking-widest">
            Onboarding
          </span>
        </div>
        <h1 className="text-5xl font-black uppercase tracking-tighter font-syne text-white m-0">
          Getting Started
        </h1>
        <p className="text-white/50 text-lg mt-4 max-w-2xl font-light">
          Everything you need to set up the World Building Kit and start creating.
        </p>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: () => null, // Hidden custom header
            h2: ({ children }) => (
              <h2 className="text-2xl font-bold uppercase tracking-tight font-syne mt-16 mb-6 text-primary flex items-center gap-3">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-bold mt-10 mb-4 text-white/90 border-l-2 border-white/10 pl-4">
                {children}
              </h3>
            ),
            code: ({ className, children, ...props }) => (
              <code
                className={`${className || ''} bg-white/5 px-1.5 py-0.5 rounded font-mono text-sm text-primary/80`}
                {...props}
              >
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <div className="relative group">
                <div className="absolute top-3 right-3 p-1 rounded bg-black/50 text-white/30">
                  <Terminal className="w-3 h-3" />
                </div>
                <pre className="bg-[#0a0a0a] border border-white/5 p-6 rounded-xl overflow-x-auto my-6 font-mono text-sm shadow-2xl shadow-black/50">
                  {children}
                </pre>
              </div>
            ),
            a: ({ href, children }) => {
              // Intercept local links to docs
              const isLocalDoc = href?.includes('docs/') || href?.endsWith('.md')

              return (
                <a
                  href={href}
                  className="text-primary hover:text-primary/80 underline decoration-primary/30 underline-offset-4 transition-colors"
                  target={href?.startsWith('http') ? '_blank' : undefined}
                  rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {children}
                </a>
              )
            },
            ul: ({ children }) => (
              <ul className="list-disc list-inside space-y-2 my-4 text-white/70">{children}</ul>
            ),
            p: ({ children }) => <p className="text-white/70 leading-relaxed my-4">{children}</p>,
          }}
        >
          {content}
        </ReactMarkdown>
      </motion.div>
    </div>
  )
}
