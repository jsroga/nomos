import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus, Trash2, Wand2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { ButtonSizeKey, ButtonVariantKey } from '@/components/Button/constants/button-styles'
import { enumArgType } from './_helpers/arg-types'
import { noopClick } from './_helpers/handlers'

const meta = {
  title: 'Primitives/Button',
  component: Button,
  args: {
    children: 'Generate episode',
    onClick: noopClick,
  },
  argTypes: {
    variant: enumArgType(ButtonVariantKey),
    size: enumArgType(ButtonSizeKey),
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Disabled: Story = {
  args: { disabled: true, children: 'Generating…' },
}

export const Destructive: Story = {
  args: {
    variant: ButtonVariantKey.Destructive,
    children: 'Delete scene',
  },
}

export const WithIcon: Story = {
  render: args => (
    <div className="flex items-center gap-3">
      <Button {...args}>
        <Wand2 className="mr-2 h-4 w-4" />
        Generate with AI
      </Button>
      <Button variant={ButtonVariantKey.Destructive}>
        <Trash2 className="mr-2 h-4 w-4" />
        Remove character
      </Button>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size={ButtonSizeKey.Sm}>Small</Button>
      <Button size={ButtonSizeKey.Default}>Default</Button>
      <Button size={ButtonSizeKey.Lg}>Large</Button>
      <Button size={ButtonSizeKey.Icon} aria-label="Add entity">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  ),
}
