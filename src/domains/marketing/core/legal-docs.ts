import 'server-only'
import fs from 'node:fs/promises'
import path from 'node:path'

const LEGAL_DIR = path.join(process.cwd(), 'src/domains/marketing/legal')

export const LEGAL_DOCS = {
  terms: {
    filename: 'terms.md',
    fallbackTitle: 'Terms and Conditions',
  },
  privacy: {
    filename: 'privacy.md',
    fallbackTitle: 'Privacy Policy',
  },
} as const

export type LegalDocSlug = keyof typeof LEGAL_DOCS

export async function loadLegalMarkdown(slug: LegalDocSlug): Promise<string> {
  const { filename, fallbackTitle } = LEGAL_DOCS[slug]
  const filePath = path.join(LEGAL_DIR, filename)

  try {
    return await fs.readFile(filePath, 'utf8')
  } catch {
    return `# ${fallbackTitle}\n\nContent could not be loaded.`
  }
}
