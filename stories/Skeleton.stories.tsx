import type { Meta, StoryObj } from '@storybook/react-vite'
import { Skeleton } from '@/components/Skeleton'

const meta = {
  title: 'Primitives/Skeleton',
  component: Skeleton,
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Line: Story = {
  render: () => <Skeleton className="h-4 w-64" />,
}

export const Block: Story = {
  render: () => <Skeleton className="h-24 w-80" />,
}

export const CardPlaceholder: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3 rounded-lg border border-border p-6">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="mt-2 h-9 w-24" />
    </div>
  ),
}
