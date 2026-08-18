import type { Meta, StoryObj } from '@storybook/react-vite'
import { Pencil, Trash2, Wand2 } from 'lucide-react'
import { IconButton } from '@/components/IconButton'
import { enumArgType } from './_helpers/arg-types'
import { noopClick } from './_helpers/handlers'

const IconButtonVariant = {
  Default: 'default',
  Ghost: 'ghost',
  Outline: 'outline',
  Destructive: 'destructive',
  Secondary: 'secondary',
} as const

const IconButtonSize = {
  Sm: 'sm',
  Default: 'default',
  Lg: 'lg',
} as const

const meta = {
  title: 'Primitives/IconButton',
  component: IconButton,
  args: {
    icon: <Wand2 className="h-4 w-4" />,
    onClick: noopClick,
    tooltip: 'Generate',
  },
  argTypes: {
    variant: enumArgType(IconButtonVariant),
    size: enumArgType(IconButtonSize),
    disabled: { control: 'boolean' },
    isActive: { control: 'boolean' },
    isLoading: { control: 'boolean' },
  },
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Disabled: Story = {
  args: {
    icon: <Trash2 className="h-4 w-4" />,
    disabled: true,
    tooltip: 'Delete',
  },
}

export const Loading: Story = {
  args: {
    isLoading: true,
    tooltip: 'Generating',
  },
}

export const Active: Story = {
  args: {
    icon: <Pencil className="h-4 w-4" />,
    isActive: true,
    tooltip: 'Edit',
  },
}

export const Destructive: Story = {
  args: {
    icon: <Trash2 className="h-4 w-4" />,
    variant: IconButtonVariant.Destructive,
    tooltip: 'Delete',
  },
}
