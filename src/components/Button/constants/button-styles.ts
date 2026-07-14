export const BUTTON_BASE_CLASS =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

export enum ButtonVariantKey {
  Default = 'default',
  Destructive = 'destructive',
  Outline = 'outline',
  Secondary = 'secondary',
  Ghost = 'ghost',
  Link = 'link',
}

export enum ButtonSizeKey {
  Default = 'default',
  Sm = 'sm',
  Lg = 'lg',
  Icon = 'icon',
}

// Typed via `${Enum}` so VariantProps accepts both the enum members and their
// literal string values at call sites (string enums are otherwise nominal).
export const BUTTON_VARIANT_CLASSES: Record<`${ButtonVariantKey}`, string> = {
  [ButtonVariantKey.Default]: 'bg-primary/20 text-primary hover:bg-primary/30',
  [ButtonVariantKey.Destructive]: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  [ButtonVariantKey.Outline]:
    'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  [ButtonVariantKey.Secondary]: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  [ButtonVariantKey.Ghost]: 'hover:bg-accent hover:text-accent-foreground',
  [ButtonVariantKey.Link]: 'text-primary underline-offset-4 hover:underline',
} as const

export const BUTTON_SIZE_CLASSES: Record<`${ButtonSizeKey}`, string> = {
  [ButtonSizeKey.Default]: 'h-10 px-4 py-2',
  [ButtonSizeKey.Sm]: 'h-9 rounded-md px-3',
  [ButtonSizeKey.Lg]: 'h-11 rounded-md px-8',
  [ButtonSizeKey.Icon]: 'h-10 w-10',
} as const
