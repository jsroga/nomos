'use client'

import { ApiReference } from '@scalar/nextjs-api-reference'

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <ApiReference
        configuration={{
          spec: {
            url: '/openapi.json',
          },
          theme: 'dark',
          layout: 'modern',
        }}
      />
    </div>
  )
}
