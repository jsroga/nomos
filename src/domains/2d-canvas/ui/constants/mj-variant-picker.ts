export enum MjVariantLabel {
  U1 = 'U1',
  U2 = 'U2',
  U3 = 'U3',
  U4 = 'U4',
}

export enum MjVariantPosition {
  TopLeft = 'top-0 left-0',
  TopRight = 'top-0 right-0',
  BottomLeft = 'bottom-0 left-0',
  BottomRight = 'bottom-0 right-0',
}

export const MJ_VARIANT_PICKER_COPY = {
  FAILED_SELECT_VARIANT_LOG: 'Failed to select variant:',
  FAILED_SELECT_VARIANT_TOAST: 'Failed to select variant',
} as const
