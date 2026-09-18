'use client'

import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/Button'
import { ButtonSizeKey, ButtonVariantKey } from '@/components/Button/constants/button-styles'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/Tooltip'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { cn } from '@/shared/data/utils'
import { useStorytellerChatBusy } from '@/domains/storyteller/state/hooks/useStorytellerChatBusy'
import {
  StorytellerRefreshClass,
  StorytellerRefreshCopy,
} from './storyteller-refresh-copy'

interface StorytellerRefreshButtonProps {
  onClick: () => void
  idleLabel?: string
  extraDisabled?: boolean
  className?: string
}

export function StorytellerRefreshButton({
  onClick,
  idleLabel = StorytellerRefreshCopy.Generate,
  extraDisabled = false,
  className,
}: StorytellerRefreshButtonProps) {
  const chatBusy = useStorytellerChatBusy()
  const disabled = chatBusy || extraDisabled
  const tooltip = disabled ? StorytellerRefreshCopy.Busy : idleLabel

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={StorytellerRefreshClass.Trigger}>
          <Button
            type={HtmlElementType.Button}
            size={ButtonSizeKey.Icon}
            variant={ButtonVariantKey.Ghost}
            disabled={disabled}
            aria-label={tooltip}
            onClick={onClick}
            className={cn(StorytellerRefreshClass.Button, className)}
          >
            <RefreshCw size={14} className={disabled ? StorytellerRefreshClass.Spin : undefined} />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
