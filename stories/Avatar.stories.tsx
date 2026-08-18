import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/Avatar'
import { BROKEN_IMAGE_SRC, PLACEHOLDER_AVATAR } from './_helpers/media'

const meta = {
  title: 'Primitives/Avatar',
  component: Avatar,
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Image: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src={PLACEHOLDER_AVATAR} alt="Maren Voss" />
      <AvatarFallback>MV</AvatarFallback>
    </Avatar>
  ),
}

export const Fallback: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>MV</AvatarFallback>
    </Avatar>
  ),
}

export const BrokenImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src={BROKEN_IMAGE_SRC} alt="Missing" />
      <AvatarFallback>??</AvatarFallback>
    </Avatar>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={PLACEHOLDER_AVATAR} alt="Small" />
        <AvatarFallback>S</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarImage src={PLACEHOLDER_AVATAR} alt="Default" />
        <AvatarFallback>M</AvatarFallback>
      </Avatar>
      <Avatar className="h-14 w-14">
        <AvatarImage src={PLACEHOLDER_AVATAR} alt="Large" />
        <AvatarFallback>L</AvatarFallback>
      </Avatar>
    </div>
  ),
}

export const Grouped: Story = {
  render: () => (
    <div className="flex -space-x-2">
      <Avatar className="border-2 border-background">
        <AvatarFallback>MV</AvatarFallback>
      </Avatar>
      <Avatar className="border-2 border-background">
        <AvatarFallback>AK</AvatarFallback>
      </Avatar>
      <Avatar className="border-2 border-background">
        <AvatarFallback>+4</AvatarFallback>
      </Avatar>
    </div>
  ),
}
