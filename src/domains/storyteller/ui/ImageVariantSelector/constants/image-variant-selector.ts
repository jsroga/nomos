export enum ImageVariantLabel {
  V1 = 'V1',
  V2 = 'V2',
  V3 = 'V3',
  V4 = 'V4',
}

export enum ImageVariantPosition {
  TopLeft = 'top-0 left-0',
  TopRight = 'top-0 right-0',
  BottomLeft = 'bottom-0 left-0',
  BottomRight = 'bottom-0 right-0',
}

export enum ImageVariantCanvas {
  Context2d = '2d',
}

export const IMAGE_VARIANT_CROP_FAILED_LOG = 'Failed to crop image'

export const IMAGE_VARIANT_GRID = [
  { index: 1 as const, label: ImageVariantLabel.V1, position: ImageVariantPosition.TopLeft },
  { index: 2 as const, label: ImageVariantLabel.V2, position: ImageVariantPosition.TopRight },
  { index: 3 as const, label: ImageVariantLabel.V3, position: ImageVariantPosition.BottomLeft },
  { index: 4 as const, label: ImageVariantLabel.V4, position: ImageVariantPosition.BottomRight },
]
