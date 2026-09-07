'use client'

import type { FC } from 'react'
import { Button } from '@/components/Button'
import { ButtonVariantKey } from '@/components/Button/constants/button-styles'
import { ManuscriptMode } from '@/domains/storyteller/core/types/enums'
import { StorytellerHeaderClass } from '@/domains/storyteller/ui/StorytellerLayout/constants/storyteller-module-header'
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
  Row = 'flex h-full items-center gap-2',
  Cluster = 'flex h-full items-center gap-1',
  Button = 'h-auto hover:bg-transparent disabled:pointer-events-none disabled:opacity-50',
}

export enum ScriptEditorChromeClass {
  Bar = 'min-h-[50px] shrink-0 border-t border-border/30 flex items-center gap-2 px-[22px] py-2.5 bg-card/50',
  Loading = 'ml-auto text-xs leading-none text-primary animate-pulse',
}

export enum ScriptEditorStatusCopy {
  Writing = 'Writing...',
}

function manuscriptToolbarButtonClass(active = false): string {
  return cn(
    StorytellerHeaderClass.Edit,
    ScriptEditorToolbarClass.Button,
    active ? StorytellerHeaderClass.TabActive : '',
  )
}

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
  return (
    <div className={ScriptEditorToolbarClass.Row}>
      <div
        className={ScriptEditorToolbarClass.Cluster}
        role="group"
        aria-label={ScriptEditorToolbarCopy.ModeGroup}
      >
        <Button
          type={HtmlElementType.Button}
          variant={ButtonVariantKey.Ghost}
          className={manuscriptToolbarButtonClass(mode === ManuscriptMode.Script)}
          aria-pressed={mode === ManuscriptMode.Script}
          onClick={() => onModeChange?.(ManuscriptMode.Script)}
        >
          {ScriptEditorToolbarCopy.Script}
        </Button>
        <Button
          type={HtmlElementType.Button}
          variant={ButtonVariantKey.Ghost}
          className={manuscriptToolbarButtonClass(mode === ManuscriptMode.Novel)}
          aria-pressed={mode === ManuscriptMode.Novel}
          onClick={() => onModeChange?.(ManuscriptMode.Novel)}
        >
          {ScriptEditorToolbarCopy.Novel}
        </Button>
      </div>
      <div className={ScriptEditorToolbarClass.Cluster}>
        <Button
          type={HtmlElementType.Button}
          variant={ButtonVariantKey.Ghost}
          className={manuscriptToolbarButtonClass()}
          disabled={generateDisabled}
          title={generateDisabledReason}
          onClick={onGenerateNext}
        >
          {ScriptEditorToolbarCopy.GenerateNext}
        </Button>
        <Button
          type={HtmlElementType.Button}
          variant={ButtonVariantKey.Ghost}
          className={manuscriptToolbarButtonClass()}
          disabled={generateDisabled}
          title={generateDisabledReason}
          onClick={onRegenerateSection}
        >
          {ScriptEditorToolbarCopy.RegenerateSection}
        </Button>
        <Button
          type={HtmlElementType.Button}
          variant={ButtonVariantKey.Ghost}
          className={manuscriptToolbarButtonClass()}
          disabled={generateDisabled}
          title={generateDisabledReason}
          onClick={onCompile}
        >
          {ScriptEditorToolbarCopy.Compile}
        </Button>
      </div>
    </div>
  )
}
