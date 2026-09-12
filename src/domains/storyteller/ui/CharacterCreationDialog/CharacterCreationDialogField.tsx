import React from 'react'
import { RefreshCw } from 'lucide-react'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { cn } from '@/shared/data/utils'
import {
  CHARACTER_DIALOG_FIELD_BORDER_INVALID,
  CHARACTER_DIALOG_FIELD_BORDER_VALID,
  CharacterDialogFieldClass,
  CharacterDialogRefreshCopy,
} from './constants/character-creation-dialog'

interface CharacterCreationDialogFieldProps {
  label: string
  required?: boolean
  touched: boolean
  isValid: boolean
  errorMessage: string
  children: React.ReactNode
  labelClassName?: string
  onRefresh?: () => void
  refreshDisabled?: boolean
}

export function fieldBorderClass(isInvalid: boolean): string {
  return isInvalid ? CHARACTER_DIALOG_FIELD_BORDER_INVALID : CHARACTER_DIALOG_FIELD_BORDER_VALID
}

export function CharacterCreationDialogField({
  label,
  required = false,
  touched,
  isValid,
  errorMessage,
  children,
  labelClassName,
  onRefresh,
  refreshDisabled = false,
}: CharacterCreationDialogFieldProps) {
  return (
    <div className="space-y-2">
      <div className={CharacterDialogFieldClass.LabelRow}>
        <label className={cn(CharacterDialogFieldClass.Label, labelClassName)}>
          {label} {required && <span className="text-destructive">*</span>}
        </label>
        {onRefresh ? (
          <button
            type={HtmlElementType.Button}
            className={CharacterDialogFieldClass.Refresh}
            aria-label={`${CharacterDialogRefreshCopy.AriaPrefix}${label}`}
            disabled={refreshDisabled}
            onClick={onRefresh}
          >
            <RefreshCw size={12} strokeWidth={2} />
          </button>
        ) : null}
      </div>
      {children}
      {touched && !isValid && <p className="text-xs text-destructive mt-1">{errorMessage}</p>}
    </div>
  )
}
