import type { Meta, StoryObj } from '@storybook/react-vite'
import { BleedingText } from '@/components/BleedingText'

const meta = {
  title: 'Effects/BleedingText',
  component: BleedingText,
  args: {
    text: 'The Hollow Crown',
    className: 'text-4xl font-bold',
  },
} satisfies Meta<typeof BleedingText>

export default meta
type Story = StoryObj<typeof meta>

export const Resting: Story = {
  render: args => (
    <div className="flex h-40 items-center justify-center">
      <BleedingText {...args} />
    </div>
  ),
}

export const Hover: Story = {
  render: args => (
    <div className="flex h-40 items-center justify-center">
      <BleedingText {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Hover the title — particles spawn from cursor velocity.',
      },
    },
  },
}

export const AlternateColor: Story = {
  args: {
    text: 'Season Two',
    className: 'text-3xl font-bold',
    textColor: '#8b5cf6',
    particleColor: '#22d3ee',
  },
  render: args => (
    <div className="flex h-40 items-center justify-center">
      <BleedingText {...args} />
    </div>
  ),
}
