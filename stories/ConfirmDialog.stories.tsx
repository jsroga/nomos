import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, userEvent, within } from 'storybook/test'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ConfirmDialogVariant } from '@/components/ConfirmDialog/constants/confirm-dialog-copy'
import { enumArgType } from './_helpers/arg-types'
import { noopConfirm, noopOpenChange } from './_helpers/handlers'
import { OverlayCanvas, neverResolves, overlayStoryParams } from './_helpers/overlay'

const meta = {
  title: 'Overlays/ConfirmDialog',
  component: ConfirmDialog,
  parameters: overlayStoryParams(),
  args: {
    open: true,
    onOpenChange: noopOpenChange,
    title: 'Commit this beat?',
    description: 'The current draft replaces the cork-board card.',
    onConfirm: noopConfirm,
  },
  argTypes: {
    variant: enumArgType(ConfirmDialogVariant),
    open: { control: 'boolean' },
  },
} satisfies Meta<typeof ConfirmDialog>

export default meta
type Story = StoryObj<typeof meta>

export const OpenDefault: Story = {
  render: args => (
    <OverlayCanvas>
      <ConfirmDialog {...args} />
    </OverlayCanvas>
  ),
}

export const OpenDestructive: Story = {
  args: {
    title: 'Regenerate the season arc?',
    description:
      'This replaces the current 22-episode outline with a fresh draft. Locked episodes are preserved.',
    confirmLabel: 'Regenerate',
    variant: ConfirmDialogVariant.Destructive,
  },
  render: args => (
    <OverlayCanvas>
      <ConfirmDialog {...args} />
    </OverlayCanvas>
  ),
}

export const Loading: Story = {
  args: {
    title: 'Regenerate the season arc?',
    description: 'Stays pending so the loading buttons stay on canvas.',
    confirmLabel: 'Regenerate',
    variant: ConfirmDialogVariant.Destructive,
    onConfirm: fn(neverResolves),
  },
  render: args => (
    <OverlayCanvas>
      <ConfirmDialog {...args} />
    </OverlayCanvas>
  ),
  play: async ({ canvasElement }) => {
    const body = canvasElement.ownerDocument.body
    const confirm = await within(body).findByRole('button', { name: 'Regenerate' })
    await userEvent.click(confirm)
  },
}

export const LongDescription: Story = {
  args: {
    title: 'Rewrite locked episodes too?',
    description:
      'Locked episodes normally survive regeneration. Confirming this also rewrites those outlines, re-runs critic passes, and may invalidate storyboard frames already exported for production.',
  },
  render: args => (
    <OverlayCanvas>
      <ConfirmDialog {...args} />
    </OverlayCanvas>
  ),
}

export const Closed: Story = {
  args: {
    open: false,
  },
  render: args => (
    <OverlayCanvas>
      <Button variant="outline">Delete scene</Button>
      <ConfirmDialog {...args} />
    </OverlayCanvas>
  ),
}
