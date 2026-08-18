import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from '@/components/Badge'
import { enumArgType } from './_helpers/arg-types'

const BadgeVariant = {
  Default: 'default',
  Secondary: 'secondary',
  Destructive: 'destructive',
  Outline: 'outline',
} as const

const meta = {
  title: 'Primitives/Badge',
  component: Badge,
  args: {
    children: 'Storyteller',
  },
  argTypes: {
    variant: enumArgType(BadgeVariant),
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Secondary: Story = {
  args: { variant: BadgeVariant.Secondary, children: 'Draft' },
}

export const Outline: Story = {
  args: { variant: BadgeVariant.Outline, children: 'Locked' },
}

export const Destructive: Story = {
  args: { variant: BadgeVariant.Destructive, children: 'Failed' },
}

export const LongLabel: Story = {
  args: {
    children: 'Consistency check — 2 open plot threads',
  },
}
