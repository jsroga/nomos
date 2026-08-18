import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileUploader } from '@/components/FileUploader'
import { FileUploaderKind } from '@/components/FileUploader/constants/file-uploader'
import {
  noopCancel,
  noopDownload,
  noopPick,
  noopRemove,
  noopRetry,
  noopSelect,
} from './_helpers/handlers'
import { failedAsset, queuedAsset, readyAsset, uploadingAsset } from './_helpers/uploader-items'

const meta = {
  title: 'Primitives/FileUploader',
  component: FileUploader,
  args: {
    items: [],
    onPick: noopPick,
    onRemove: noopRemove,
    onSelect: noopSelect,
    onDownload: noopDownload,
    onCancel: noopCancel,
    onRetry: noopRetry,
    accept: 'image/*',
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof FileUploader>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const Filled: Story = {
  args: {
    items: [
      readyAsset('1', 'keep.webp'),
      { ...readyAsset('2', 'courtyard.webp'), kind: FileUploaderKind.ThreeD, selected: true },
      readyAsset('3', 'gate.webp'),
    ],
  },
}

export const Uploading: Story = {
  args: {
    items: [readyAsset('1', 'keep.webp'), uploadingAsset],
  },
}

export const Queued: Story = {
  args: {
    items: [readyAsset('1', 'keep.webp'), queuedAsset],
  },
}

export const Failed: Story = {
  args: {
    items: [readyAsset('1', 'keep.webp'), failedAsset],
  },
}
