'use client'

import React from 'react'
import { Check } from 'lucide-react'

interface StreamingSectionsInlineProps {
  sections: Array<{ id: string; label: string; status: string }>
  className?: string
}

export const StreamingSectionsInline: React.FC<StreamingSectionsInlineProps> = ({
  sections,
  className,
}) => {
  return (
    <div className={className || 'space-y-2'}>
      {sections.map(section => (
        <div
          key={section.id}
          className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30 border border-muted"
        >
          {section.status === 'in_progress' && (
            <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          )}
          {section.status === 'completed' && (
            <Check className="w-3 h-3 text-green-500" />
          )}
          <span className="font-medium text-muted-foreground">
            Generating {section.label}...
          </span>
        </div>
      ))}
    </div>
  )
}
