import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/components/Button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/DropdownMenu'
import { OverlayCanvas, overlayStoryParams } from './_helpers/overlay'

const meta = {
  title: 'Overlays/DropdownMenu',
  component: DropdownMenu,
  parameters: overlayStoryParams(),
} satisfies Meta<typeof DropdownMenu>

export default meta
type Story = StoryObj<typeof meta>

function EpisodeMenu({
  open,
  withIcons,
  destructive,
  disabledItem,
  nested,
}: {
  open?: boolean
  withIcons?: boolean
  destructive?: boolean
  disabledItem?: boolean
  nested?: boolean
}) {
  return (
    <OverlayCanvas className="flex min-h-[480px] justify-center pt-2">
      <DropdownMenu open={open}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Episode actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Episode 14</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Open in writers room
            {withIcons ? <DropdownMenuShortcut>⌘O</DropdownMenuShortcut> : null}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={disabledItem}>Regenerate beats</DropdownMenuItem>
          {nested ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Duplicate to</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>This season</DropdownMenuItem>
                <DropdownMenuItem>New season</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : (
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked>Locked</DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className={destructive ? 'text-destructive' : undefined}>
            Delete episode
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </OverlayCanvas>
  )
}

export const Open: Story = {
  render: () => <EpisodeMenu open />,
}

export const WithIcons: Story = {
  render: () => <EpisodeMenu open withIcons />,
}

export const DestructiveItem: Story = {
  render: () => <EpisodeMenu open destructive />,
}

export const DisabledItem: Story = {
  render: () => <EpisodeMenu open disabledItem />,
}

export const Nested: Story = {
  render: () => <EpisodeMenu open nested />,
}
