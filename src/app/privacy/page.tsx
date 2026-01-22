import fs from 'fs'
import path from 'path'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function PrivacyPage() {
  const filePath = path.join(process.cwd(), 'src/content/legal/privacy.md')
  let content = ''
  try {
    content = fs.readFileSync(filePath, 'utf8')
  } catch (err) {
    content = '# Privacy Policy\n\nContent could not be loaded.'
  }

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
