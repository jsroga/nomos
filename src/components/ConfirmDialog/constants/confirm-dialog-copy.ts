/** Confirm dialog default labels and variants (eslint-exempt constants folder). */

export enum ConfirmDialogVariant {
  Default = 'default',
  Destructive = 'destructive',
}

export enum ConfirmDialogChoice {
  Confirm = 'confirm',
  Secondary = 'secondary',
  Dismissed = 'dismissed',
}

export const CONFIRM_DIALOG_CONFIRM_LABEL = 'Confirm'
export const CONFIRM_DIALOG_CANCEL_LABEL = 'Cancel'
export const CONFIRM_DIALOG_DEFAULT_VARIANT = ConfirmDialogVariant.Default
