import type { Meta, StoryObj } from '@storybook/react-vite'
import { Progress } from '@/components/Progress'

const meta = {
  title: 'Primitives/Progress',
  component: Progress,
  args: {
    value: 40,
    max: 100,
    className: 'w-80',
  },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100 } },
    max: { control: 'number' },
  },
} satisfies Meta<typeof Progress>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: { value: 0 },
}

export const Partial: Story = {
  args: { value: 42 },
}

export const Complete: Story = {
  args: { value: 100 },
}

export const CustomMax: Story = {
  args: { value: 3, max: 8 },
}

export const Zero: Story = {
  args: { value: 0, max: 1 },
}
