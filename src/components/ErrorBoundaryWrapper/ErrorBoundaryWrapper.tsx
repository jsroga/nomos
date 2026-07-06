'use client'

import React from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { TroubleshootPanel } from '@/components/shell/TroubleshootPanel'

interface Props {
  children: React.ReactNode
}

export function ErrorBoundaryWrapper({ children }: Props) {
  return (
    <ErrorBoundary>
      {children}
      <TroubleshootPanel />
    </ErrorBoundary>
  )
}
