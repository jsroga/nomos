'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { SidebarSection } from '@/components/ui/domain-sidebar'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'

type ParsedOperation = {
  id: string
  label: string
  coords?: string
  stage: string
  progress?: number
}

function formatStage(stage: string): string {
  return stage
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

function parseOperationDetails(id: string, label: string, details?: string): ParsedOperation {
  if (!details) {
    return { id, label, stage: 'Starting' }
  }

  const progressMatch = details.match(/(\d+)%$/)
  const coordsMatch = details.match(/^\([^)]+\)/)

  const progress = progressMatch ? Number(progressMatch[1]) : undefined
  const coords = coordsMatch?.[0]
  const stageText = details
    .replace(/^\([^)]+\)\s*/, '')
    .replace(/\s+\d+%$/, '')
    .trim()

  return {
    id,
    label,
    coords,
    progress,
    stage: formatStage(stageText || 'In progress'),
  }
}

export const WorldGenProgressPanel: React.FC = () => {
  const operations = useGlobalStatusStore(state => state.operations)

  const activeOperations = operations
    .filter(op => op.type === 'world-gen' && (op.status === 'in-progress' || op.status === 'pending'))
    .map(op => parseOperationDetails(op.id, op.label, op.details))

  if (activeOperations.length === 0) {
    return null
  }

  return (
    <SidebarSection separator title="Progress" icon={<Loader2 size={12} className="animate-spin" />}>
      <div className="space-y-3">
        {activeOperations.map(operation => (
          <div key={operation.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-foreground/90">
                  {operation.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {operation.coords ? `${operation.coords} • ` : ''}
                  {operation.stage}
                </div>
              </div>
              <div className="text-xs font-mono text-primary">
                {operation.progress !== undefined ? `${operation.progress}%` : '...'}
              </div>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-background/80">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${operation.progress ?? 12}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </SidebarSection>
  )
}
