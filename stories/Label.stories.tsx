import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'

const meta = {
  title: 'Primitives/Label',
  component: Label,
  args: {
    children: 'Project name',
  },
} satisfies Meta<typeof Label>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithControl: Story = {
  render: args => (
    <div className="grid w-80 gap-2">
      <Label htmlFor="named" {...args} />
      <Input id="named" defaultValue="The Hollow Crown" />
    </div>
  ),
}

export const DisabledPeer: Story = {
  render: () => (
    <div className="grid w-80 gap-2">
      <Label htmlFor="locked" className="peer-disabled:opacity-50">
        Series title (locked)
      </Label>
      <Input id="locked" disabled defaultValue="The Hollow Crown" />
    </div>
  ),
}
