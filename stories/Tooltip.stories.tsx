import type { Meta, StoryObj } from '@storybook/react-vite'
import { Wand2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { IconButton } from '@/components/IconButton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/Tooltip'
import { OverlayCanvas, overlayStoryParams } from './_helpers/overlay'
import { noopClick } from './_helpers/handlers'

const meta = {
  title: 'Overlays/Tooltip',
  component: Tooltip,
  parameters: overlayStoryParams(360),
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {
  render: () => (
    <OverlayCanvas className="flex min-h-[240px] items-end justify-center pb-8">
      <Tooltip open>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover target</Button>
        </TooltipTrigger>
        <TooltipContent>Generate beats for this scene</TooltipContent>
      </Tooltip>
    </OverlayCanvas>
  ),
}

export const LongLabel: Story = {
  render: () => (
    <OverlayCanvas className="flex min-h-[240px] items-end justify-center pb-8">
      <Tooltip open>
        <TooltipTrigger asChild>
          <Button variant="outline">Consistency</Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          Flagged because episode 14 still references a location removed from the World Bible.
        </TooltipContent>
      </Tooltip>
    </OverlayCanvas>
  ),
}

export const DisabledTrigger: Story = {
  render: () => (
    <OverlayCanvas className="flex min-h-[240px] items-end justify-center pb-8">
      <Tooltip open>
        <TooltipTrigger asChild>
          <span>
            <Button disabled>Generating…</Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Wait for the current generation to finish</TooltipContent>
      </Tooltip>
    </OverlayCanvas>
  ),
}

export const WithIconButton: Story = {
  render: () => (
    <OverlayCanvas className="flex min-h-[240px] items-end justify-center pb-8">
      <Tooltip open>
        <TooltipTrigger asChild>
          <span>
            <IconButton icon={<Wand2 className="h-4 w-4" />} onClick={noopClick} />
          </span>
        </TooltipTrigger>
        <TooltipContent>Generate</TooltipContent>
      </Tooltip>
    </OverlayCanvas>
  ),
}

export const Resting: Story = {
  render: () => (
    <OverlayCanvas className="flex min-h-[160px] items-center justify-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover to reveal</Button>
        </TooltipTrigger>
        <TooltipContent>Generate beats for this scene</TooltipContent>
      </Tooltip>
    </OverlayCanvas>
  ),
}
