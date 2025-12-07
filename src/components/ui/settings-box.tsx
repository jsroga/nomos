'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface SettingsBoxProps {
  title: string
  children: React.ReactNode
  className?: string
  headerActions?: React.ReactNode
}

export const SettingsBox: React.FC<SettingsBoxProps> = ({
  title,
  children,
  className,
  headerActions,
}) => {
  return (
    <div className={cn('bg-muted p-4 rounded-lg border border-border space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
      </div>
      {children}
    </div>
  )
}
