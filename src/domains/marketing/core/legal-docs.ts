import 'server-only'
import fs from 'node:fs/promises'
import path from 'node:path'
import { cacheLife, cacheTag } from 'next/cache'
import {
  FILE_ENCODING_UTF8,
  LEGAL_DOC_PRIVACY_FILENAME,
  LEGAL_DOC_PRIVACY_TITLE,
  LEGAL_DOC_TERMS_FILENAME,
  LEGAL_DOC_TERMS_TITLE,
} from '@/domains/marketing/constants/legal-docs'

const LEGAL_DIR = path.join(process.cwd(), 'src/domains/marketing/legal')

enum LegalCacheLife {
  Days = 'days',
}

enum LegalCacheTag {
  Terms = 'legal-terms',
  Privacy = 'legal-privacy',
}

export const LEGAL_DOCS = {
  terms: {
    filename: LEGAL_DOC_TERMS_FILENAME,
    fallbackTitle: LEGAL_DOC_TERMS_TITLE,
    tag: LegalCacheTag.Terms,
  },
  privacy: {
    filename: LEGAL_DOC_PRIVACY_FILENAME,
    fallbackTitle: LEGAL_DOC_PRIVACY_TITLE,
    tag: LegalCacheTag.Privacy,
  },
} as const

export type LegalDocSlug = keyof typeof LEGAL_DOCS

export async function loadLegalMarkdown(slug: LegalDocSlug): Promise<string> {
  'use cache'
  cacheLife(LegalCacheLife.Days)
  const doc = LEGAL_DOCS[slug]
  cacheTag(doc.tag)

  const filePath = path.join(LEGAL_DIR, doc.filename)

  try {
    return await fs.readFile(filePath, FILE_ENCODING_UTF8)
  } catch {
    return `# ${doc.fallbackTitle}\n\nContent could not be loaded.`
  }
}
