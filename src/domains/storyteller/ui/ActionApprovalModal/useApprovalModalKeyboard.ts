import { useEffect } from 'react'
import {
  ApprovalViewMode,
  DOM_EVENT_KEYDOWN,
  KEYBOARD_KEY,
} from '@/domains/storyteller/ui/ActionApprovalModal/constants/action-approval-display'

interface ApprovalModalKeyboardOptions {
  isOpen: boolean
  viewMode: ApprovalViewMode
  currentChangeIndex: number
  changeCount: number
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  setCurrentChangeIndex: (index: number) => void
  setViewMode: (mode: ApprovalViewMode) => void
}

export function useApprovalModalKeyboard({
  isOpen,
  viewMode,
  currentChangeIndex,
  changeCount,
  onClose,
  onApprove,
  onReject,
  setCurrentChangeIndex,
  setViewMode,
}: ApprovalModalKeyboardOptions): void {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === KEYBOARD_KEY.ESCAPE) {
        onClose()
        return
      }
      if (event.key === KEYBOARD_KEY.ENTER && !event.shiftKey) {
        event.preventDefault()
        onApprove()
        return
      }
      if (event.key === KEYBOARD_KEY.DELETE || event.key === KEYBOARD_KEY.BACKSPACE) {
        event.preventDefault()
        onReject()
        return
      }
      if (event.key === KEYBOARD_KEY.ARROW_LEFT && viewMode === ApprovalViewMode.DIFF) {
        event.preventDefault()
        setCurrentChangeIndex(Math.max(0, currentChangeIndex - 1))
        return
      }
      if (event.key === KEYBOARD_KEY.ARROW_RIGHT && viewMode === ApprovalViewMode.DIFF) {
        event.preventDefault()
        setCurrentChangeIndex(Math.min(changeCount - 1, currentChangeIndex + 1))
        return
      }
      if (event.key === KEYBOARD_KEY.TAB) {
        event.preventDefault()
        setViewMode(
          viewMode === ApprovalViewMode.SUMMARY ? ApprovalViewMode.DIFF : ApprovalViewMode.SUMMARY
        )
      }
    }

    window.addEventListener(DOM_EVENT_KEYDOWN, handleKeyDown)
    return () => window.removeEventListener(DOM_EVENT_KEYDOWN, handleKeyDown)
  }, [
    isOpen,
    viewMode,
    currentChangeIndex,
    changeCount,
    onApprove,
    onReject,
    onClose,
    setCurrentChangeIndex,
    setViewMode,
  ])
}
