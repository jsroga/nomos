'use client'

import type { FC } from 'react'
import { BookOpen, Layers, RefreshCw, ScrollText, Sparkles } from 'lucide-react'
import { AutosaveIndicator } from '@/components/AutosaveIndicator'
import { Button } from '@/components/Button'
import { ButtonVariantKey } from '@/components/Button/constants/button-styles'
import { ManuscriptMode } from '@/domains/storyteller/core/types/enums'
import { StorytellerHeaderClass } from '@/domains/storyteller/ui/StorytellerLayout/constants/storyteller-module-header'
import { StorytellerSidebarFooterClass } from '@/domains/storyteller/ui/StorytellerLayout/utils/storyteller-sidebar-footer'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { cn } from '@/shared/data/utils'

export enum ScriptEditorToolbarCopy {
  ModeGroup = 'Manuscript mode',
  Script = 'Script',
  Novel = 'Novel',
  GenerateNext = 'Generate next',
  RegenerateSection = 'Regenerate this section',
  Compile = 'Compile',
  BeatsGate = 'Beats is the gate',
}

export enum ScriptEditorToolbarClass {
  Row = 'flex h-full min-w-0 flex-1 items-center gap-2',
  Cluster = 'flex h-full items-center gap-1',
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
  mode: ManuscriptMode
  onModeChange?: (mode: ManuscriptMode) => void
  onGenerateNext?: () => void
  onRegenerateSection?: () => void
  onCompile?: () => void
  generateDisabled?: boolean
  generateDisabledReason?: string
}

export const ScriptEditorManuscriptToolbar: FC<ScriptEditorManuscriptToolbarProps> = ({
  mode,
  onModeChange,
  onGenerateNext,
  onRegenerateSection,
  onCompile,
  generateDisabled = true,
  generateDisabledReason,
}) => {
  const scriptSelected = mode === ManuscriptMode.Script
  const novelSelected = mode === ManuscriptMode.Novel

  return (
    <div className={ScriptEditorToolbarClass.Row}>
      <div
        className={cn(StorytellerHeaderClass.Switch, ScriptEditorToolbarClass.Cluster)}
        role="tablist"
        aria-label={ScriptEditorToolbarCopy.ModeGroup}
      >
        <button
          type={HtmlElementType.Button}
          role="tab"
          aria-selected={scriptSelected}
          className={cn(
            StorytellerHeaderClass.Segment,
            scriptSelected ? StorytellerHeaderClass.SegmentActive : StorytellerHeaderClass.SegmentIdle,
          )}
          onClick={() => onModeChange?.(ManuscriptMode.Script)}
        >
          <ScrollText
            size={ICON_SIZE}
            strokeWidth={ICON_STROKE}
            className={scriptSelected ? 'text-primary' : undefined}
          />
          {ScriptEditorToolbarCopy.Script}
        </button>
        <button
          type={HtmlElementType.Button}
          role="tab"
          aria-selected={novelSelected}
          className={cn(
            StorytellerHeaderClass.Segment,
            novelSelected ? StorytellerHeaderClass.SegmentActive : StorytellerHeaderClass.SegmentIdle,
          )}
          onClick={() => onModeChange?.(ManuscriptMode.Novel)}
        >
          <BookOpen
            size={ICON_SIZE}
            strokeWidth={ICON_STROKE}
            className={novelSelected ? 'text-primary' : undefined}
          />
          {ScriptEditorToolbarCopy.Novel}
        </button>
      </div>
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
