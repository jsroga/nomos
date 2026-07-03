'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConsistencyChange } from '@/domains/storyteller/core/ConsistencyTypes'

interface JSONDiffViewerProps {
  changes: ConsistencyChange[]
  className?: string
}

export const JSONDiffViewer: React.FC<JSONDiffViewerProps> = ({ changes, className }) => {
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set([0]))

  const toggleExpanded = (index: number) => {
    setExpandedIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <div className={cn('space-y-2', className)}>
      {changes.map((change, index) => (
        <div key={index} className="border border-border/30 rounded-lg overflow-hidden bg-muted/10">
          {/* Header */}
          <button
            onClick={() => toggleExpanded(index)}
            className="w-full flex items-center gap-2 p-3 hover:bg-muted/20 transition-colors text-left"
          >
            {expandedIndices.has(index) ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
            <code className="text-xs font-mono text-primary flex-1 truncate">{change.path}</code>
          </button>

          {/* Expanded content */}
          {expandedIndices.has(index) && (
            <div className="border-t border-border/30 p-3 space-y-3 bg-background/50">
              {/* Before */}
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-destructive/80 mb-1">
                  Before
                </div>
                <div className="bg-destructive/5 border border-destructive/20 rounded p-2">
                  <JSONValue value={change.before} />
                </div>
              </div>

              {/* After */}
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-green-500/80 mb-1">
                  After
                </div>
                <div className="bg-green-500/5 border border-green-500/20 rounded p-2">
                  <JSONValue value={change.after} />
                </div>
              </div>

              {/* Reason */}
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                  Reason
                </div>
                <div className="text-xs text-foreground/80 leading-relaxed">{change.reason}</div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Render a JSON value with syntax highlighting
 */
const JSONValue: React.FC<{ value: unknown }> = ({ value }) => {
  const formatted = formatValue(value)

  return (
    <pre className="text-xs font-mono text-foreground/90 whitespace-pre-wrap break-words">
      {formatted}
    </pre>
  )
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  const type = typeof value

  if (type === 'string') return `"${value}"`
  if (type === 'number' || type === 'boolean') return String(value)

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    if (value.length <= 3) {
      return `[${value.map(v => formatValue(v)).join(', ')}]`
    }
    return `[\n${value.map(v => '  ' + formatValue(v)).join(',\n')}\n]`
  }

  if (type === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }

  return String(value)
}
