'use client'

import { ChevronUp, Download, FileCode, FileText, Sparkles } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/DropdownMenu'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import {
  isFixInconsistenciesStartDisabled,
  StorytellerSidebarFooterClass,
  StorytellerSidebarFooterCopy,
} from '../constants/storyteller-sidebar-footer'
import { useStorytellerChatBusy } from '@/domains/storyteller/state/hooks/useStorytellerChatBusy'

interface StorytellerSidebarFooterProps {
  hasBible: boolean
  onFix: () => void
}

export function StorytellerSidebarFooter({ hasBible, onFix }: StorytellerSidebarFooterProps) {
  const chatBusy = useStorytellerChatBusy()
  const fixDisabled = isFixInconsistenciesStartDisabled(hasBible, chatBusy)
  return (
    <div className={StorytellerSidebarFooterClass.Bar}>
      <button
        type={HtmlElementType.Button}
        disabled={fixDisabled}
        onClick={onFix}
        className={StorytellerSidebarFooterClass.Ghost}
      >
        <Sparkles size={13} strokeWidth={1.8} />
        {StorytellerSidebarFooterCopy.Fix}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={!hasBible}>
          <button type={HtmlElementType.Button} disabled={!hasBible} className={StorytellerSidebarFooterClass.Export}>
            <Download size={13} strokeWidth={1.7} />
            {StorytellerSidebarFooterCopy.Export}
            <ChevronUp size={11} strokeWidth={2.2} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={StorytellerSidebarFooterClass.Menu}>
          <DropdownMenuItem className={StorytellerSidebarFooterClass.Row}>
            <FileCode size={13} strokeWidth={1.7} className="text-muted-foreground" />
            <span className="flex-1">{StorytellerSidebarFooterCopy.Html}</span>
            <span className={StorytellerSidebarFooterClass.Ext}>{StorytellerSidebarFooterCopy.HtmlExt}</span>
          </DropdownMenuItem>
          <DropdownMenuItem className={StorytellerSidebarFooterClass.Row}>
            <FileText size={13} strokeWidth={1.7} className="text-muted-foreground" />
            <span className="flex-1">{StorytellerSidebarFooterCopy.Pdf}</span>
            <span className={StorytellerSidebarFooterClass.Ext}>{StorytellerSidebarFooterCopy.PdfExt}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}