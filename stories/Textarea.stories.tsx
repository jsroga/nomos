import type { Meta, StoryObj } from '@storybook/react-vite'
import { Label } from '@/components/Label'
import { Textarea } from '@/components/Textarea'

const meta = {
  title: 'Primitives/Textarea',
  component: Textarea,
  args: {
    placeholder: 'Describe the terrain…',
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  render: args => (
    <div className="grid w-96 gap-2">
      <Label htmlFor="premise">Premise</Label>
      <Textarea id="premise" {...args} />
    </div>
  ),
}

export const Filled: Story = {
  args: {
    defaultValue: 'Maps rewrite themselves when the ink dries.',
  },
  render: args => (
    <div className="grid w-96 gap-2">
      <Label htmlFor="filled">Premise</Label>
      <Textarea id="filled" {...args} />
    </div>
  ),
}

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: 'Locked after bible lock.',
  },
  render: args => (
    <div className="grid w-96 gap-2">
      <Label htmlFor="locked">Premise (locked)</Label>
      <Textarea id="locked" {...args} />
    </div>
  ),
}

export const Focus: Story = {
  args: {
    autoFocus: true,
    defaultValue: 'Focused notes',
  },
  render: args => (
    <div className="grid w-96 gap-2">
      <Label htmlFor="focus">Notes</Label>
      <Textarea id="focus" {...args} />
    </div>
  ),
}

export const LongContent: Story = {
  args: {
    defaultValue:
      'A deposed cartographer discovers the kingdom’s maps are rewriting themselves — and whoever controls the ink controls the borders. Ashen Keep’s upper battlements are a ledger. When the ink dries, the census updates in the World Bible. Characters who vanish from the map still occupy scenes until a critic pass flags the contradiction.',
    className: 'min-h-[160px]',
  },
  render: args => (
    <div className="grid w-96 gap-2">
      <Label htmlFor="long">Season notes</Label>
      <Textarea id="long" {...args} />
    </div>
  ),
}
