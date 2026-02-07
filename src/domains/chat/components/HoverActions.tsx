'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Copy, RefreshCw, Edit3, Check } from 'lucide-react'

interface HoverActionsProps {
  content: string
  onCopy?: () => void
  onEdit?: () => void
  onRegenerate?: () => void
  className?: string
  position?: 'top-right' | 'bottom-right'
}

export const HoverActions: React.FC<HoverActionsProps> = ({
  content,
  onCopy,
  onEdit,
  onRegenerate,
  className,
  position = 'top-right',
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      onCopy?.()
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div
      className={cn(
        'absolute flex items-center gap-0.5 p-0.5 rounded-md bg-card/95 border border-border/50 shadow-sm backdrop-blur-sm',
        'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
        position === 'top-right' && 'top-1 right-1',
        position === 'bottom-right' && 'bottom-1 right-1',
        className
      )}
    >
      <ActionButton
        icon={copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
        label={copied ? 'Copied!' : 'Copy'}
        onClick={handleCopy}
      />

      {onEdit && (
        <ActionButton icon={<Edit3 className="w-3 h-3" />} label="Edit" onClick={onEdit} />
      )}

      {onRegenerate && (
        <ActionButton
          icon={<RefreshCw className="w-3 h-3" />}
          label="Regenerate"
          onClick={onRegenerate}
        />
      )}
    </div>
  )
}

// Individual action button
const ActionButton: React.FC<{
  icon: React.ReactNode
  label: string
  onClick: () => void
}> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    title={label}
    className={cn(
      'p-1.5 rounded hover:bg-muted/80 transition-colors',
      'text-muted-foreground hover:text-foreground'
    )}
  >
    {icon}
  </button>
)

// Wrapper component that adds hover actions to children
interface WithHoverActionsProps {
  children: React.ReactNode
  content: string
  onEdit?: () => void
  onRegenerate?: () => void
  className?: string
  showActions?: boolean
}

export const WithHoverActions: React.FC<WithHoverActionsProps> = ({
  children,
  content,
  onEdit,
  onRegenerate,
  className,
  showActions = true,
}) => {
  if (!showActions) {
    return <>{children}</>
  }

  return (
    <div className={cn('relative group', className)}>
      {children}
      <HoverActions content={content} onEdit={onEdit} onRegenerate={onRegenerate} />
    </div>
  )
}
