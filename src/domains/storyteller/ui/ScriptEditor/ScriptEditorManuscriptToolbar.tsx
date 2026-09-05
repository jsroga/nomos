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
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1" role="group" aria-label={ScriptEditorToolbarCopy.ModeGroup}>
        <Button
          type="button"
          size={ButtonSizeKey.Sm}
          variant={mode === ManuscriptMode.Script ? ButtonVariantKey.Default : ButtonVariantKey.Ghost}
          aria-pressed={mode === ManuscriptMode.Script}
          onClick={() => onModeChange?.(ManuscriptMode.Script)}
        >
          {ScriptEditorToolbarCopy.Script}
        </Button>
        <Button
          type="button"
          size={ButtonSizeKey.Sm}
          variant={mode === ManuscriptMode.Novel ? ButtonVariantKey.Default : ButtonVariantKey.Ghost}
          aria-pressed={mode === ManuscriptMode.Novel}
          onClick={() => onModeChange?.(ManuscriptMode.Novel)}
        >
          {ScriptEditorToolbarCopy.Novel}
        </Button>
      </div>
      <Button
        type="button"
        size={ButtonSizeKey.Sm}
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
        variant={ButtonVariantKey.Outline}
        disabled={generateDisabled}
        title={generateDisabledReason}
        onClick={onCompile}
      >
        {ScriptEditorToolbarCopy.Compile}
      </Button>
    </div>
  )
}
