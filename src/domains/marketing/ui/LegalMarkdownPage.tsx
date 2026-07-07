import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { loadLegalMarkdown, type LegalDocSlug } from '../core/legal-docs'

type LegalMarkdownPageProps = {
  doc: LegalDocSlug
}

export async function LegalMarkdownPage({ doc }: LegalMarkdownPageProps) {
  const content = await loadLegalMarkdown(doc)

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-16 font-mono">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-primary hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <div className="prose prose-invert prose-headings:font-syne prose-headings:uppercase prose-p:text-white/70 prose-li:text-white/70">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
