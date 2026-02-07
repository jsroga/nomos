'use client'

import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'

export default function ModuleDocsPage() {
    const { slug } = useParams()
    const [content, setContent] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        if (!slug) return

        const fetchDoc = async () => {
            try {
                setLoading(true)
                // In a real implementation with a server, we would fetch this from an API
                // For this task, we assume the docs are available or we might need a small API route
                // For now, we'll try to fetch from a public path or similar if available, 
                // but since we are in a local environment, we'll suggest an API route if needed.
                const res = await fetch(`/api/docs/modules/${slug}`)
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

    if (loading) {
        return <div className="animate-pulse text-white/20 font-mono">LOADING_DOCUMENTS...</div>
    }

    if (error) {
        return (
            <div className="border border-red-500/20 bg-red-500/5 p-8 rounded-xl">
                <h1 className="text-red-500 font-black uppercase tracking-tighter font-syne mb-2">
                    DOCUMENT_NOT_FOUND
                </h1>
                <p className="text-white/40 font-mono text-sm underlineDecoration">
                    The requested module documentation could not be retrieved.
                </p>
            </div>
        )
    }

    return (
        <div className="prose prose-invert prose-primary max-w-none">
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
                            <h2 className="text-2xl font-bold uppercase tracking-tight font-syne mt-16 mb-6 text-primary">
                                {children}
                            </h2>
                        ),
                        h3: ({ children }) => (
                            <h3 className="text-lg font-bold mt-10 mb-4 text-white/90">{children}</h3>
                        ),
                        h4: ({ children }) => (
                            <h4 className="text-base font-semibold mt-8 mb-3 text-white/80">{children}</h4>
                        ),
                        code: ({ className, children, ...props }) => (
                            <code
                                className={`${className || ''} bg-white/5 px-1.5 py-0.5 rounded font-mono text-sm`}
                                {...props}
                            >
                                {children}
                            </code>
                        ),
                        pre: ({ children }) => (
                            <pre className="bg-[#0a0a0a] border border-white/5 p-6 rounded-xl overflow-x-auto my-6 font-mono text-sm">
                                {children}
                            </pre>
                        ),
                        table: ({ children }) => (
                            <div className="overflow-x-auto my-6">
                                <table className="w-full border-collapse border border-white/10 text-sm">
                                    {children}
                                </table>
                            </div>
                        ),
                        th: ({ children }) => (
                            <th className="border border-white/10 bg-white/5 px-4 py-2 text-left font-semibold">
                                {children}
                            </th>
                        ),
                        td: ({ children }) => <td className="border border-white/10 px-4 py-2">{children}</td>,
                        hr: () => <hr className="border-white/10 my-10" />,
                        ul: ({ children }) => (
                            <ul className="list-disc list-inside space-y-2 my-4">{children}</ul>
                        ),
                        ol: ({ children }) => (
                            <ol className="list-decimal list-inside space-y-2 my-4">{children}</ol>
                        ),
                        li: ({ children }) => <li className="text-white/70">{children}</li>,
                        p: ({ children }) => <p className="text-white/70 leading-relaxed my-4">{children}</p>,
                        strong: ({ children }) => (
                            <strong className="text-white font-semibold">{children}</strong>
                        ),
                        a: ({ href, children }) => (
                            <a
                                href={href}
                                className="text-primary hover:underline"
                                target={href?.startsWith('http') ? '_blank' : undefined}
                                rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                            >
                                {children}
                            </a>
                        ),
                    }}
                >
                    {content}
                </ReactMarkdown>
            </motion.div>
        </div>
    )
}
