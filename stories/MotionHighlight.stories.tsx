import type { Meta, StoryObj } from '@storybook/react-vite'
import { MotionHighlight } from '@/components/TextEffects'
import { noopSelect } from './_helpers/handlers'

const MODULES = ['Storyteller', 'Loop Creator', 'Interior Designer', 'Asset Exporter']

const meta = {
  title: 'Effects/MotionHighlight',
  component: MotionHighlight,
  args: {
    items: MODULES,
    onSelect: noopSelect,
  },
} satisfies Meta<typeof MotionHighlight>

export default meta
type Story = StoryObj<typeof meta>

export const Resting: Story = {
  render: args => (
    <div className="w-80">
      <MotionHighlight {...args} />
    </div>
  ),
}

export const Hover: Story = {
  render: args => (
    <div className="w-80">
      <MotionHighlight {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Hover a module name to slide the highlight.',
      },
    },
  },
}

export const AlternateColor: Story = {
  render: args => (
    <div className="w-80 rounded-md border border-primary/30 bg-primary/5 p-3">
      <MotionHighlight {...args} items={['Bible', 'Beats', 'Script']} />
    </div>
  ),
}
