import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/components/Button'
import { ImageLightbox } from '@/components/ImageLightbox'
import { OverlayCanvas, overlayStoryParams, OVERLAY_LIGHTBOX_HEIGHT, OVERLAY_LIGHTBOX_MIN_HEIGHT_CLASS } from './_helpers/overlay'
import { noopClose, noopNext, noopPrev } from './_helpers/handlers'
import { PLACEHOLDER_LIGHTBOX } from './_helpers/media'

const meta = {
  title: 'Overlays/ImageLightbox',
  component: ImageLightbox,
  parameters: overlayStoryParams(OVERLAY_LIGHTBOX_HEIGHT),
  args: {
    isOpen: true,
    onClose: noopClose,
    imageSrc: PLACEHOLDER_LIGHTBOX,
    imageAlt: 'Concept art — Ashen Keep',
  },
} satisfies Meta<typeof ImageLightbox>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {
  render: args => (
    <OverlayCanvas className={OVERLAY_LIGHTBOX_MIN_HEIGHT_CLASS}>
      <ImageLightbox {...args} />
    </OverlayCanvas>
  ),
}

export const WithNav: Story = {
  args: {
    hasNext: true,
    hasPrev: true,
    onNext: noopNext,
    onPrev: noopPrev,
  },
  render: args => (
    <OverlayCanvas className={OVERLAY_LIGHTBOX_MIN_HEIGHT_CLASS}>
      <ImageLightbox {...args} />
    </OverlayCanvas>
  ),
}

export const FirstOnly: Story = {
  args: {
    hasNext: true,
    hasPrev: false,
    onNext: noopNext,
  },
  render: args => (
    <OverlayCanvas className={OVERLAY_LIGHTBOX_MIN_HEIGHT_CLASS}>
      <ImageLightbox {...args} />
    </OverlayCanvas>
  ),
}

export const LastOnly: Story = {
  args: {
    hasNext: false,
    hasPrev: true,
    onPrev: noopPrev,
  },
  render: args => (
    <OverlayCanvas className={OVERLAY_LIGHTBOX_MIN_HEIGHT_CLASS}>
      <ImageLightbox {...args} />
    </OverlayCanvas>
  ),
}

export const Closed: Story = {
  args: {
    isOpen: false,
  },
  render: args => (
    <OverlayCanvas className={OVERLAY_LIGHTBOX_MIN_HEIGHT_CLASS}>
      <Button variant="outline">Open lightbox</Button>
      <ImageLightbox {...args} />
    </OverlayCanvas>
  ),
}
