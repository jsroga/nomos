'use client'

import { ApiReferenceReact } from '@scalar/api-reference-react'
import '@scalar/api-reference-react/style.css'
import './api-docs-scalar.css'
import { ApiDocsChrome } from '@/domains/marketing/ui/ApiDocs/components/ApiDocsChrome'
import { API_DOCS_SCALAR_CONFIGURATION } from '@/domains/marketing/ui/ApiDocs/constants/api-docs-scalar-config'
import { ApiDocsUiClass } from '@/domains/marketing/ui/ApiDocs/constants/api-docs'

export function ApiDocsPage() {
  return (
    <div className={ApiDocsUiClass.Root}>
      <ApiDocsChrome />
      <ApiReferenceReact configuration={API_DOCS_SCALAR_CONFIGURATION} />
    </div>
  )
}
