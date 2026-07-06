import type React from 'react'

export interface TourStep {
  content: React.ReactNode
  selectorId: string
  width?: number
  height?: number
  onClickWithinArea?: () => void
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  action?: () => void
  hideNext?: boolean
  advanceEvent?: string
}
