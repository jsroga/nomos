import 'server-only'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  FILE_ENCODING_UTF8,
  LEGAL_DOC_PRIVACY_FILENAME,
  LEGAL_DOC_PRIVACY_TITLE,
  LEGAL_DOC_TERMS_FILENAME,
  LEGAL_DOC_TERMS_TITLE,
} from '@/domains/marketing/constants/legal-docs'

const LEGAL_DIR = path.join(process.cwd(), 'src/domains/marketing/legal')

export const LEGAL_DOCS = {
  terms: {
    filename: LEGAL_DOC_TERMS_FILENAME,
    fallbackTitle: LEGAL_DOC_TERMS_TITLE,
  },
  privacy: {
    filename: LEGAL_DOC_PRIVACY_FILENAME,
    fallbackTitle: LEGAL_DOC_PRIVACY_TITLE,
  },
} as const

export type LegalDocSlug = keyof typeof LEGAL_DOCS

export async function loadLegalMarkdown(slug: LegalDocSlug): Promise<string> {
  const { filename, fallbackTitle } = LEGAL_DOCS[slug]
  const filePath = path.join(LEGAL_DIR, filename)

  try {
    return await fs.readFile(filePath, FILE_ENCODING_UTF8)
  } catch {
    return `# ${fallbackTitle}\n\nContent could not be loaded.`
  }
}
