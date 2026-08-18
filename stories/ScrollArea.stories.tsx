import type { Meta, StoryObj } from '@storybook/react-vite'
import { ScrollArea } from '@/components/ScrollArea'

const meta = {
  title: 'Primitives/ScrollArea',
  component: ScrollArea,
} satisfies Meta<typeof ScrollArea>

export default meta
type Story = StoryObj<typeof meta>

const longCopy = Array.from({ length: 24 }, (_, index) => `Beat ${index + 1} — cork-board card`).join(
  '\n',
)

export const Short: Story = {
  render: () => (
    <ScrollArea className="h-40 w-72 rounded-md border border-border">
      <p className="text-sm text-muted-foreground">Two lines. No overflow.</p>
    </ScrollArea>
  ),
}

export const Overflow: Story = {
  render: () => (
    <ScrollArea className="h-40 w-72 rounded-md border border-border">
      <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">{longCopy}</pre>
    </ScrollArea>
  ),
}

export const WideHorizontal: Story = {
  render: () => (
    <ScrollArea className="h-24 w-72 rounded-md border border-border">
      <div className="flex w-[48rem] gap-2 p-2">
        {Array.from({ length: 12 }, (_, index) => (
          <div
            key={index}
            className="h-12 w-24 shrink-0 rounded-md bg-muted text-center text-xs leading-[3rem] text-muted-foreground"
          >
            Tile {index + 1}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
}
