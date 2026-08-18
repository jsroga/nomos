import type { Metadata } from 'next'
import { ApiDocsPage, ApiDocsPageMeta } from '@/domains/marketing'

export const metadata: Metadata = {
  title: ApiDocsPageMeta.Title,
  description: ApiDocsPageMeta.Description,
}

export default function ApiDocsRoutePage() {
  return <ApiDocsPage />
}
