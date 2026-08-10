'use client'

import { ApiReferenceReact } from '@scalar/api-reference-react'
import '@scalar/api-reference-react/style.css'
import './api-docs-scalar.css'
import {
  ApiDocsScalarIntegration,
  ApiDocsScalarTheme,
  ApiDocsSpecUrl,
  ApiDocsUiClass,
} from '@/domains/marketing/ui/ApiDocs/constants/api-docs'

export function ApiDocsPage() {
  return (
    <div className={ApiDocsUiClass.Root}>
      <ApiReferenceReact
        configuration={{
          _integration: ApiDocsScalarIntegration.NextJs,
          url: ApiDocsSpecUrl.OpenApi,
          theme: ApiDocsScalarTheme.None,
          showSidebar: true,
          hideModels: false,
          hideDownloadButton: false,
        }}
      />
    </div>
  )
}
