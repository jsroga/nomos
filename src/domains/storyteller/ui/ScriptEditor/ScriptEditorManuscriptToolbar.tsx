'use client'

import type { FC } from 'react'
import { Button } from '@/components/Button'
import { ButtonSizeKey, ButtonVariantKey } from '@/components/Button/constants/button-styles'
import { ManuscriptMode } from '@/domains/storyteller/core/types/enums'

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
  Button = 'h-7 px-2 text-xs',
}

export enum ScriptEditorChromeClass {
  Bar = 'h-9 shrink-0 border-t border-border/30 flex items-center gap-2 px-3 pt-1 bg-card/50',
  Loading = 'ml-auto text-xs leading-none text-primary animate-pulse',
}

export enum ScriptEditorStatusCopy {
  Writing = 'Writing...',
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
          type="button"
          size={ButtonSizeKey.Sm}
          className={ScriptEditorToolbarClass.Button}
          variant={mode === ManuscriptMode.Script ? ButtonVariantKey.Default : ButtonVariantKey.Ghost}
          aria-pressed={mode === ManuscriptMode.Script}
          onClick={() => onModeChange?.(ManuscriptMode.Script)}
        >
          {ScriptEditorToolbarCopy.Script}
        </Button>
        <Button
          type="button"
          size={ButtonSizeKey.Sm}
          className={ScriptEditorToolbarClass.Button}
          variant={mode === ManuscriptMode.Novel ? ButtonVariantKey.Default : ButtonVariantKey.Ghost}
          aria-pressed={mode === ManuscriptMode.Novel}
          onClick={() => onModeChange?.(ManuscriptMode.Novel)}
        >
          {ScriptEditorToolbarCopy.Novel}
        </Button>
      </div>
      <div className={ScriptEditorToolbarClass.Cluster}>
        <Button
          type="button"
          size={ButtonSizeKey.Sm}
          className={ScriptEditorToolbarClass.Button}
          variant={ButtonVariantKey.Outline}
          disabled={generateDisabled}
          title={generateDisabledReason}
          onClick={onGenerateNext}
        >
          {ScriptEditorToolbarCopy.GenerateNext}
        </Button>
        <Button
          type="button"
          size={ButtonSizeKey.Sm}
          className={ScriptEditorToolbarClass.Button}
          variant={ButtonVariantKey.Outline}
          disabled={generateDisabled}
          title={generateDisabledReason}
          onClick={onRegenerateSection}
        >
          {ScriptEditorToolbarCopy.RegenerateSection}
        </Button>
        <Button
          type="button"
          size={ButtonSizeKey.Sm}
          className={ScriptEditorToolbarClass.Button}
          variant={ButtonVariantKey.Outline}
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
