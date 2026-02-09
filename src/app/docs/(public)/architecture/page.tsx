'use client'

import React, { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion } from 'framer-motion'
import { Code, Network } from 'lucide-react'

// Mermaid diagram component with brand colors
function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
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
            // Brand colors
            primaryColor: '#5c7cfa',
            primaryTextColor: '#ffffff',
            primaryBorderColor: '#5c7cfa',
            secondaryColor: '#1a1a2e',
            secondaryTextColor: '#a1a1aa',
            tertiaryColor: '#0a0a0a',
            lineColor: '#5c7cfa',
            textColor: '#ffffff',
            mainBkg: '#0a0a0a',
            nodeBorder: '#5c7cfa',
            clusterBkg: '#1a1a2e',
            clusterBorder: '#5c7cfa33',
            titleColor: '#ffffff',
            edgeLabelBackground: '#0a0a0a',
            nodeTextColor: '#ffffff',
          },
          fontFamily: 'JetBrains Mono, monospace',
          flowchart: {
            curve: 'basis',
            padding: 20,
          },
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

  if (error) {
    return (
      <div className="my-8 p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
        <p className="text-red-400 text-sm font-mono">Diagram render error</p>
        <pre className="text-white/50 text-xs mt-2 overflow-x-auto">{chart}</pre>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="my-8 p-6 bg-[#0a0a0a] border border-white/5 rounded-xl overflow-x-auto flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

export default function ArchitectureDocsPage() {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/docs/architecture')
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
  }, [])

  if (loading) {
    return <div className="animate-pulse text-white/20 font-mono">LOADING_ARCHITECTURE...</div>
  }

  if (error) {
    return (
      <div className="border border-red-500/20 bg-red-500/5 p-8 rounded-xl">
        <h1 className="text-red-500 font-black uppercase tracking-tighter font-syne mb-2">
          DOCUMENT_NOT_FOUND
        </h1>
        <p className="text-white/40 font-mono text-sm">
          The architecture documentation could not be retrieved.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-none">
      {/* Header Banner */}
      <div className="mb-12 border-b border-white/10 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Network className="w-6 h-6 text-primary" />
          </div>
          <span className="font-mono text-xs text-primary uppercase tracking-widest">
            System Architecture
          </span>
        </div>
        <h1 className="text-5xl font-black uppercase tracking-tighter font-syne text-white m-0">
          System Architecture
        </h1>
        <p className="text-white/60 text-xl mt-4 max-w-2xl leading-relaxed">
          Technical overview of the World Building Kit, including agentic patterns, service
          integrations, and data flow.
        </p>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: () => null,
            h2: ({ children }) => (
              <h2 className="text-2xl font-bold uppercase tracking-tight font-syne mt-20 mb-8 text-primary flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xl font-semibold mt-12 mb-5 text-white border-l-2 border-primary/30 pl-4">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-lg font-medium mt-8 mb-4 text-white/90">{children}</h4>
            ),
            code: ({ className, children, ...props }) => {
              // Check for language class (language-mermaid, language-javascript, etc.)
              const match = /language-(\w+)/.exec(className || '')
              const lang = match?.[1]
              const codeString = String(children).replace(/\n$/, '')

              // Mermaid diagrams - render directly
              if (lang === 'mermaid') {
                return <MermaidDiagram chart={codeString} />
              }

              // Inline code (no className means inline)
              if (!className) {
                return (
                  <code
                    className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono text-sm"
                    {...props}
                  >
                    {children}
                  </code>
                )
              }

              // Regular code blocks
              return (
                <code className={`${className || ''} text-white/80`} {...props}>
                  {children}
                </code>
              )
            },
            pre: ({ children, node, ...props }) => {
              // Check if this pre contains a mermaid code block
              // ReactMarkdown wraps code blocks in pre, so we need to check the child
              const codeChild = node?.children?.[0] as any
              const classNames = codeChild?.properties?.className || []
              const isMermaid = classNames.some((c: string) => c === 'language-mermaid')

              // If mermaid, the code component already handles it, just pass through
              if (isMermaid) {
                return <>{children}</>
              }

              return (
                <div className="relative group my-8">
                  <div className="absolute top-3 right-3 p-1.5 rounded bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Code className="w-4 h-4 text-white/30" />
                  </div>
                  <pre
                    className="bg-[#0a0a0a] border border-white/5 p-6 rounded-xl overflow-x-auto font-mono text-sm leading-relaxed"
                    {...props}
                  >
                    {children}
                  </pre>
                </div>
              )
            },
            table: ({ children }) => (
              <div className="overflow-x-auto my-10 border border-white/5 rounded-xl bg-white/[0.02]">
                <table className="w-full border-collapse">{children}</table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border-b border-white/10 bg-white/5 px-6 py-4 text-left font-bold text-white uppercase tracking-wider text-xs">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border-b border-white/5 px-6 py-4 text-white/70 text-[15px] leading-relaxed">
                {children}
              </td>
            ),
            hr: () => <hr className="border-white/10 my-16" />,
            ul: ({ children }) => <ul className="space-y-3 my-6 ml-1">{children}</ul>,
            ol: ({ children }) => (
              <ol className="list-decimal list-outside space-y-3 my-6 ml-6 text-white/80">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="flex gap-3 text-white/80 text-[16px] leading-relaxed">
                <span className="text-primary mt-2">•</span>
                <span>{children}</span>
              </li>
            ),
            p: ({ children }) => (
              <p className="text-white/80 text-[16px] leading-[1.8] my-5">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="text-white font-semibold">{children}</strong>
            ),
            em: ({ children }) => <em className="text-white/70 italic">{children}</em>,
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-primary hover:text-primary/80 underline decoration-primary/30 underline-offset-4 transition-colors"
                target={href?.startsWith('http') ? '_blank' : undefined}
                rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-primary/40 bg-primary/5 rounded-r-xl px-6 py-5 my-8 text-white/80 text-[15px] leading-relaxed">
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
