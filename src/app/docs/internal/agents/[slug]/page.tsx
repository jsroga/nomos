'use client'

import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import { ArrowLeft, Cpu } from 'lucide-react'
import Link from 'next/link'

function MermaidDiagram({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#ef4444',
            primaryTextColor: '#ffffff',
            primaryBorderColor: '#ef4444',
            secondaryColor: '#1a1a2e',
            secondaryTextColor: '#a1a1aa',
            lineColor: '#ef4444',
          },
          fontFamily: 'JetBrains Mono, monospace',
        })
        const id = `mermaid-${Math.random().toString(36).slice(2)}`
        const { svg: renderedSvg } = await mermaid.render(id, chart)
        setSvg(renderedSvg)
      } catch (err) {
        console.error('Mermaid render error:', err)
        setError(String(err))
      }
    }
    renderDiagram()
  }, [chart])

  if (error)
    return <pre className="text-red-400 text-xs p-4 border border-red-500/20 rounded">{error}</pre>
  return (
    <div
      className="my-8 p-6 bg-[#0a0a0a] border border-white/5 rounded-xl overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

export default function AgentDocPage() {
  const { slug } = useParams()
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!slug) return
    const fetchDoc = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/docs/internal/agents/${slug}`)
        if (!res.ok) throw new Error('Not found')
        const data = await res.text()
        setContent(data)
      } catch (err) {
        console.error(err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchDoc()
  }, [slug])

  if (loading)
    return <div className="animate-pulse text-white/20 font-mono">LOADING_AGENT_DOC...</div>

  if (error) {
    return (
      <div className="border border-red-500/20 bg-red-500/5 p-8 rounded-xl">
        <h1 className="text-red-500 font-black uppercase tracking-tighter font-syne mb-2">
          DOC_NOT_FOUND
        </h1>
        <p className="text-white/40 font-mono text-sm">
          The requested agent documentation could not be retrieved.
        </p>
        <Link
          href="/docs/internal/agents"
          className="inline-flex items-center gap-2 mt-4 text-red-500 hover:text-red-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Agent Overview
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-none">
      <div className="mb-8 border-b border-white/5 pb-8">
        <Link
          href="/docs/internal/agents"
          className="inline-flex items-center gap-2 text-white/40 hover:text-white mb-6 text-sm font-mono transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Agent Internals
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/5 rounded-lg">
            <Cpu className="w-6 h-6 text-white/60" />
          </div>
          <span className="font-mono text-xs text-white/40 uppercase tracking-widest">
            Agent Architecture
          </span>
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-4xl font-black uppercase tracking-tighter font-syne mb-8 text-white">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-2xl font-bold uppercase tracking-tight font-syne mt-16 mb-6 text-white/90">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xl font-semibold mt-10 mb-4 text-white/80">{children}</h3>
            ),
            code: ({ className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || '')
              const lang = match?.[1]
              if (lang === 'mermaid') return <MermaidDiagram chart={String(children).trim()} />
              return !className ? (
                <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-sm" {...props}>
                  {children}
                </code>
              ) : (
                <code className={`${className || ''} text-white/80`} {...props}>
                  {children}
                </code>
              )
            },
            pre: ({ children, node }) => {
              const codeNode = node?.children?.[0] as any
              if (codeNode?.properties?.className?.includes('language-mermaid'))
                return <>{children}</>
              return (
                <div className="relative group my-6">
                  <pre className="bg-[#0a0a0a] border border-white/5 p-6 rounded-xl overflow-x-auto font-mono text-sm">
                    {children}
                  </pre>
                </div>
              )
            },
            table: ({ children }) => (
              <div className="overflow-x-auto my-8 border border-white/5 rounded-xl">
                <table className="w-full text-sm">{children}</table>
              </div>
            ),
            th: ({ children }) => (
              <th className="bg-white/5 px-6 py-4 text-left font-bold text-white/80 uppercase tracking-widest text-xs border-b border-white/5">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border-b border-white/5 px-6 py-4 text-white/60">{children}</td>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 decoration-cyan-400/30 transition-colors"
                target={href?.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
              >
                {children}
              </a>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside space-y-2 my-4 text-white/70">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside space-y-2 my-4 text-white/70">{children}</ol>
            ),
            p: ({ children }) => <p className="text-white/70 leading-relaxed my-4">{children}</p>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-white/10 pl-6 py-2 my-6 text-white/50 italic">
                {children}
              </blockquote>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </motion.div>
    </div>
  )
}
