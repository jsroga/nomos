import React from 'react'
import { Globe, RefreshCw } from 'lucide-react'
import { IconButton } from '@/components/IconButton'
import { WORLD_DESCRIPTION_REGEN_PROMPT } from '../constants/bible-overview'

interface WorldDescriptionHeaderProps {
  isReadOnly: boolean
  isWorldDescLoading: boolean
  onSendMessage?: (msg: string, section?: string) => void
}

export const WorldDescriptionHeader: React.FC<WorldDescriptionHeaderProps> = ({
  isReadOnly,
  isWorldDescLoading,
  onSendMessage,
}) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <Globe className="w-5 h-5 text-primary/70" />
      <h3 className="font-syne font-bold text-lg">Overview</h3>
    </div>
    {!isReadOnly && onSendMessage ? (
      <IconButton
        icon={<RefreshCw size={14} className={isWorldDescLoading ? 'animate-spin' : ''} />}
        onClick={() => onSendMessage(WORLD_DESCRIPTION_REGEN_PROMPT, 'worldDescription')}
        disabled={isWorldDescLoading}
        tooltip="Generate World Description"
        size="sm"
      />
    ) : null}
  </div>
)
