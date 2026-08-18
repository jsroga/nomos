import type { Meta, StoryObj } from '@storybook/react-vite'
import { LiquidDistortionText } from '@/components/TextEffects'

const meta = {
  title: 'Effects/LiquidDistortionText',
  component: LiquidDistortionText,
  args: {
    text: 'World Building Kit',
    fontSize: '2.5rem',
    animated: true,
  },
} satisfies Meta<typeof LiquidDistortionText>

export default meta
type Story = StoryObj<typeof meta>

export const Resting: Story = {
  render: args => (
    <div className="flex h-40 items-center justify-center">
      <LiquidDistortionText {...args} />
    </div>
  ),
}

export const Hover: Story = {
  args: { animated: true },
  render: args => (
    <div className="flex h-40 items-center justify-center">
      <LiquidDistortionText {...args} />
    </div>
  ),
}

export const AlternateColor: Story = {
  args: {
    text: 'Syne display',
    className: 'text-primary',
    fontSize: '2rem',
  },
  render: args => (
    <div className="flex h-40 items-center justify-center">
      <LiquidDistortionText {...args} />
    </div>
  ),
}
