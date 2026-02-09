'use client'

import { ApiReferenceReact } from '@scalar/api-reference-react'
import '@scalar/api-reference-react/style.css'

export default function ApiDocsPage() {
  return (
    <div className="scalar-themed">
      <style jsx global>{`
        .scalar-themed {
          --scalar-primary: #5c7cfa;
          --scalar-background-1: #050505;
          --scalar-background-2: #0a0a0a;
          --scalar-background-3: #111111;
          --scalar-color-1: #ffffff;
          --scalar-color-2: #a1a1aa;
          --scalar-color-3: #71717a;
          --scalar-border-color: rgba(255, 255, 255, 0.05);
          --scalar-font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
          --scalar-font-family-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
        }

        /* Brutal styling for buttons and cards inside Scalar */
        .scalar-themed .scalar-button {
          border-radius: 8px;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .scalar-app {
          --scalar-header-height: 0px; /* Hide internal header since we have ours */
        }

        .scalar-app .sidebar {
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}</style>
      <ApiReferenceReact
        configuration={{
          _integration: 'nextjs',
          url: '/openapi.json',
          theme: 'none', // Use our custom CSS
          showSidebar: true,
          hideModels: false,
          hideDownloadButton: false,
        }}
      />
    </div>
  )
}
