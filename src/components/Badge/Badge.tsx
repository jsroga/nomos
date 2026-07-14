import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/shared/data/utils'

import {
  BADGE_BASE_CLASSES,
  BADGE_DEFAULT_VARIANT,
  BADGE_VARIANT_CLASSES,
} from './constants/badge-styles'

const badgeVariants = cva(BADGE_BASE_CLASSES, {
  variants: {
    variant: BADGE_VARIANT_CLASSES,
  },
  defaultVariants: {
    variant: BADGE_DEFAULT_VARIANT,
  },
})

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
