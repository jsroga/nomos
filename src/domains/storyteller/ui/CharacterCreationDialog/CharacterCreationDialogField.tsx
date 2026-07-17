import React from 'react'
import {
  CHARACTER_DIALOG_FIELD_BORDER_INVALID,
  CHARACTER_DIALOG_FIELD_BORDER_VALID,
} from './constants/character-creation-dialog'

interface CharacterCreationDialogFieldProps {
  label: string
  required?: boolean
  touched: boolean
  isValid: boolean
  errorMessage: string
  children: React.ReactNode
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
}: CharacterCreationDialogFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {touched && !isValid && <p className="text-xs text-destructive mt-1">{errorMessage}</p>}
    </div>
  )
}
