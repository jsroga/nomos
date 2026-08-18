import type { Meta, StoryObj } from '@storybook/react-vite'
import { ThreeDAssets } from '@/components/ThreeDAssets'
import { FileUploaderKind } from '@/components/FileUploader/constants/file-uploader'
import { formatUploadingLabel } from '@/components/ThreeDAssets/constants/three-d-assets'
import {
  noopCancel,
  noopDownload,
  noopPick,
  noopRemove,
  noopRetry,
  noopSelect,
  noopToggle,
} from './_helpers/handlers'
import { failedAsset, readyAsset, uploadingAsset } from './_helpers/uploader-items'

const meta = {
  title: 'Primitives/ThreeDAssets',
  component: ThreeDAssets,
  args: {
    items: [],
    onPick: noopPick,
    onRemove: noopRemove,
    onSelect: noopSelect,
    onDownload: noopDownload,
    onCancel: noopCancel,
    onRetry: noopRetry,
    onToggleEye: noopToggle,
    showEye: true,
    eyeOn: false,
  },
} satisfies Meta<typeof ThreeDAssets>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const Filled: Story = {
  args: {
    items: [
      { ...readyAsset('1', 'keep.glb'), kind: FileUploaderKind.ThreeD },
      { ...readyAsset('2', 'gate.glb'), kind: FileUploaderKind.ThreeD, selected: true },
    ],
    eyeOn: true,
  },
}

export const Uploading: Story = {
  args: {
    items: [{ ...readyAsset('1', 'keep.glb'), kind: FileUploaderKind.ThreeD }, uploadingAsset],
    uploadingLabel: formatUploadingLabel(1, 2),
  },
}

export const Failed: Story = {
  args: {
    items: [{ ...readyAsset('1', 'keep.glb'), kind: FileUploaderKind.ThreeD }, failedAsset],
  },
}

export const EyeOff: Story = {
  args: {
    items: [{ ...readyAsset('1', 'keep.glb'), kind: FileUploaderKind.ThreeD }],
    eyeOn: false,
  },
}
