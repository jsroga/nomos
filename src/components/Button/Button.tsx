import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/data/utils'
import {
  BUTTON_BASE_CLASS,
  BUTTON_SIZE_CLASSES,
  BUTTON_VARIANT_CLASSES,
  ButtonSizeKey,
  ButtonVariantKey,
} from '@/components/Button/constants/button-styles'
import { HtmlElementType } from '@/shared/data/constants/protocol'

const buttonVariants = cva(BUTTON_BASE_CLASS, {
  variants: {
    variant: BUTTON_VARIANT_CLASSES,
    size: BUTTON_SIZE_CLASSES,
  },
  defaultVariants: {
    variant: ButtonVariantKey.Default,
    size: ButtonSizeKey.Default,
  },
})

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = HtmlElementType.Button, ...props }, ref) => {
    const Comp = asChild ? Slot : HtmlElementType.Button
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        type={type}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
