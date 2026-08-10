import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cacheLife, cacheTag } from 'next/cache'
import { loadLegalMarkdown, LEGAL_DOCS, type LegalDocSlug } from '../core/legal-docs'

type LegalMarkdownPageProps = {
  doc: LegalDocSlug
}

enum LegalPageCacheLife {
  Days = 'days',
}

export async function LegalMarkdownPage({ doc }: LegalMarkdownPageProps) {
  'use cache'
  cacheLife(LegalPageCacheLife.Days)
  cacheTag(LEGAL_DOCS[doc].tag)

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
