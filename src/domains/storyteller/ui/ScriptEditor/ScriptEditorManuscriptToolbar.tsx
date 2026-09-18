'use client'

import type { FC } from 'react'
import { Layers, RefreshCw, Sparkles } from 'lucide-react'
import { AutosaveIndicator } from '@/components/AutosaveIndicator'
import { Button } from '@/components/Button'
import { ButtonVariantKey } from '@/components/Button/constants/button-styles'
import { StorytellerSidebarFooterClass } from '@/domains/storyteller/ui/StorytellerLayout/utils/storyteller-sidebar-footer'
import { HtmlElementType } from '@/shared/data/constants/protocol'

export enum ScriptEditorToolbarCopy {
  GenerateNext = 'Generate next',
  RegenerateSection = 'Regenerate this section',
  Compile = 'Compile',
  BeatsGate = 'Beats is the gate',
}

export enum ScriptEditorToolbarClass {
  Row = 'flex h-full min-w-0 flex-1 items-center gap-2',
  Actions = 'flex h-full min-w-0 flex-1 items-center gap-1',
  Autosave = 'ml-auto flex h-full shrink-0 items-center',
}

export enum ScriptEditorChromeClass {
  Bar = 'h-[70px] shrink-0 border-t border-border/30 flex items-center gap-2 px-[22px] py-2.5 bg-card/50',
  Loading = 'ml-auto text-xs leading-none text-primary animate-pulse',
}

export enum ScriptEditorStatusCopy {
  Writing = 'Writing...',
}

const ICON_SIZE = 13
const ICON_STROKE = 1.8

export interface ScriptEditorManuscriptToolbarProps {
  onGenerateNext?: () => void
  onRegenerateSection?: () => void
  onCompile?: () => void
  generateDisabled?: boolean
  generateDisabledReason?: string
}

export const ScriptEditorManuscriptToolbar: FC<ScriptEditorManuscriptToolbarProps> = ({
  onGenerateNext,
  onRegenerateSection,
  onCompile,
  generateDisabled = true,
  generateDisabledReason,
}) => {
  return (
    <div className={ScriptEditorToolbarClass.Row}>
      <div className={ScriptEditorToolbarClass.Actions}>
        <Button
          type={HtmlElementType.Button}
          variant={ButtonVariantKey.Ghost}
          className={StorytellerSidebarFooterClass.Ghost}
          disabled={generateDisabled}
          title={generateDisabledReason}
          onClick={onGenerateNext}
        >
          <Sparkles size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          {ScriptEditorToolbarCopy.GenerateNext}
        </Button>
        <Button
          type={HtmlElementType.Button}
          variant={ButtonVariantKey.Ghost}
          className={StorytellerSidebarFooterClass.Ghost}
          disabled={generateDisabled}
          title={generateDisabledReason}
          onClick={onRegenerateSection}
        >
          <RefreshCw size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          {ScriptEditorToolbarCopy.RegenerateSection}
        </Button>
        <Button
          type={HtmlElementType.Button}
          variant={ButtonVariantKey.Ghost}
          className={StorytellerSidebarFooterClass.Ghost}
          disabled={generateDisabled}
          title={generateDisabledReason}
          onClick={onCompile}
        >
          <Layers size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          {ScriptEditorToolbarCopy.Compile}
        </Button>
      </div>
      <div className={ScriptEditorToolbarClass.Autosave}>
        <AutosaveIndicator />
      </div>
    </div>
  )
}
