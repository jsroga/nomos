import type { Meta, StoryObj } from '@storybook/react-vite'
import { Label } from '@/components/Label'
import { Slider } from '@/components/Slider'

const meta = {
  title: 'Primitives/Slider',
  component: Slider,
  args: {
    max: 100,
    defaultValue: [40],
    className: 'w-80',
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Slider>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: args => (
    <div className="grid w-80 gap-3">
      <div className="flex justify-between text-sm">
        <Label>Terrain roughness</Label>
        <span className="text-muted-foreground">0.4</span>
      </div>
      <Slider {...args} />
    </div>
  ),
}

export const Min: Story = {
  args: { defaultValue: [0] },
  render: args => (
    <div className="grid w-80 gap-3">
      <Label>Minimum</Label>
      <Slider {...args} />
    </div>
  ),
}

export const Max: Story = {
  args: { defaultValue: [100] },
  render: args => (
    <div className="grid w-80 gap-3">
      <Label>Maximum</Label>
      <Slider {...args} />
    </div>
  ),
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: [60] },
  render: args => (
    <div className="grid w-80 gap-3">
      <Label>Locked density</Label>
      <Slider {...args} />
    </div>
  ),
}

export const Focus: Story = {
  args: { autoFocus: true, defaultValue: [50] },
  render: args => (
    <div className="grid w-80 gap-3">
      <Label>Focused thumb</Label>
      <Slider {...args} />
    </div>
  ),
}
