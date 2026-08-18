import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'

const meta = {
  title: 'Primitives/Input',
  component: Input,
  args: {
    placeholder: 'e.g. The Hollow Crown',
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  render: args => (
    <div className="grid w-80 gap-2">
      <Label htmlFor="project-name">Project name</Label>
      <Input id="project-name" {...args} />
    </div>
  ),
}

export const Filled: Story = {
  args: {
    defaultValue: 'Ashen Keep — upper battlements',
  },
  render: args => (
    <div className="grid w-80 gap-2">
      <Label htmlFor="loc">Location</Label>
      <Input id="loc" {...args} />
    </div>
  ),
}

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: 'The Hollow Crown',
  },
  render: args => (
    <div className="grid w-80 gap-2">
      <Label htmlFor="locked">Series title (locked)</Label>
      <Input id="locked" {...args} />
    </div>
  ),
}

export const Focus: Story = {
  args: {
    autoFocus: true,
    defaultValue: 'Focused field',
  },
  render: args => (
    <div className="grid w-80 gap-2">
      <Label htmlFor="focus">Auto-focused</Label>
      <Input id="focus" {...args} />
    </div>
  ),
}

export const Invalid: Story = {
  args: {
    'aria-invalid': true,
    defaultValue: '',
    placeholder: 'Required',
    className: 'border-destructive focus-visible:ring-destructive',
  },
  render: args => (
    <div className="grid w-80 gap-2">
      <Label htmlFor="invalid">Episode title</Label>
      <Input id="invalid" {...args} />
      <p className="text-xs text-destructive">Title cannot be empty.</p>
    </div>
  ),
}
