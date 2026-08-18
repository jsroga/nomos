import type { Meta, StoryObj } from '@storybook/react-vite'
import { Label } from '@/components/Label'
import { Switch } from '@/components/Switch'

const meta = {
  title: 'Primitives/Switch',
  component: Switch,
  argTypes: {
    disabled: { control: 'boolean' },
    checked: { control: 'boolean' },
  },
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const Off: Story = {
  render: args => (
    <div className="flex items-center gap-3">
      <Switch id="rivers-off" {...args} />
      <Label htmlFor="rivers-off">Generate rivers</Label>
    </div>
  ),
}

export const On: Story = {
  args: { defaultChecked: true },
  render: args => (
    <div className="flex items-center gap-3">
      <Switch id="rivers-on" {...args} />
      <Label htmlFor="rivers-on">Generate rivers</Label>
    </div>
  ),
}

export const DisabledOff: Story = {
  args: { disabled: true },
  render: args => (
    <div className="flex items-center gap-3">
      <Switch id="ruins-off" {...args} />
      <Label htmlFor="ruins-off">Ancient ruins</Label>
    </div>
  ),
}

export const DisabledOn: Story = {
  args: { disabled: true, defaultChecked: true },
  render: args => (
    <div className="flex items-center gap-3">
      <Switch id="ruins-on" {...args} />
      <Label htmlFor="ruins-on">Ancient ruins</Label>
    </div>
  ),
}

export const Focus: Story = {
  args: { autoFocus: true, defaultChecked: true },
  render: args => (
    <div className="flex items-center gap-3">
      <Switch id="focus" {...args} />
      <Label htmlFor="focus">Focused switch</Label>
    </div>
  ),
}
