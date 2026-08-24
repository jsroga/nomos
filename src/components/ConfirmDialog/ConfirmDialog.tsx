'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/Dialog'
import { Button } from '@/components/Button'

import {
  CONFIRM_DIALOG_CANCEL_LABEL,
  CONFIRM_DIALOG_CONFIRM_LABEL,
  CONFIRM_DIALOG_DEFAULT_VARIANT,
  ConfirmDialogChoice,
  ConfirmDialogVariant,
} from './constants/confirm-dialog-copy'

// Callers need the variant to type the `confirm({ variant })` argument. Without
// it on the public surface, three call sites each declared a private duplicate
// that TypeScript then rejected — enum members are not cross-assignable.
export { ConfirmDialogVariant }

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  secondaryLabel?: string
  variant?: ConfirmDialogVariant
  onConfirm: () => void | Promise<void>
  onSecondary?: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = CONFIRM_DIALOG_CONFIRM_LABEL,
  cancelLabel = CONFIRM_DIALOG_CANCEL_LABEL,
  secondaryLabel,
  variant = CONFIRM_DIALOG_DEFAULT_VARIANT,
  onConfirm,
  onSecondary,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {cancelLabel}
          </Button>
          {secondaryLabel ? (
            <Button variant="secondary" onClick={onSecondary} disabled={isLoading}>
              {secondaryLabel}
            </Button>
          ) : null}
          <Button
            variant={variant === ConfirmDialogVariant.Destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook for easier usage
interface UseConfirmOptions {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  secondaryLabel?: string
  variant?: ConfirmDialogVariant
}

export function useConfirmDialog() {
  const [state, setState] = React.useState<{
    open: boolean
    options: UseConfirmOptions | null
  }>({
    open: false,
    options: null,
  })
  const resolveRef = React.useRef<((value: ConfirmDialogChoice) => void) | null>(null)

  const settle = React.useCallback((choice: ConfirmDialogChoice) => {
    const resolve = resolveRef.current
    resolveRef.current = null
    setState(prev => ({ ...prev, open: false }))
    resolve?.(choice)
  }, [])

  const choose = React.useCallback((options: UseConfirmOptions): Promise<ConfirmDialogChoice> => {
    return new Promise(resolve => {
      resolveRef.current = resolve
      setState({
        open: true,
        options,
      })
    })
  }, [])

  const confirm = React.useCallback(
    async (options: UseConfirmOptions): Promise<boolean> => {
      const result = await choose(options)
      return result === ConfirmDialogChoice.Confirm
    },
    [choose]
  )

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) settle(ConfirmDialogChoice.Dismissed)
    },
    [settle]
  )

  const handleConfirm = React.useCallback(() => {
    settle(ConfirmDialogChoice.Confirm)
  }, [settle])

  const handleSecondary = React.useCallback(() => {
    settle(ConfirmDialogChoice.Secondary)
  }, [settle])

  const ConfirmDialogComponent = React.useMemo(() => {
    if (!state.options) return null
    return (
      <ConfirmDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        title={state.options.title}
        description={state.options.description}
        confirmLabel={state.options.confirmLabel}
        cancelLabel={state.options.cancelLabel}
        secondaryLabel={state.options.secondaryLabel}
        variant={state.options.variant}
        onConfirm={handleConfirm}
        onSecondary={handleSecondary}
      />
    )
  }, [state.open, state.options, handleOpenChange, handleConfirm, handleSecondary])

  return { confirm, choose, ConfirmDialogComponent }
}
