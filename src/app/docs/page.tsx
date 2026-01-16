'use client'

import { ApiReferenceReact } from '@scalar/api-reference-react'

import '@scalar/api-reference-react/style.css'

export default function DocsPage() {
  return (
    <ApiReferenceReact
      configuration={{
        _integration: 'nextjs',
        url: '/openapi.json',
      }}
    />
  )
}
