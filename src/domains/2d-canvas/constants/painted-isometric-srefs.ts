export enum PaintedIsometricSrefId {
  One = 'painted-1',
  Two = 'painted-2',
  Three = 'painted-3',
  HarborTown = 'harbor-town',
  DustyCourtyard = 'dusty-courtyard',
}

export enum PaintedIsometricSrefUrl {
  One = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/9b80467c-18b5-4570-9b32-d66f86d71986/1787051463098.png',
  Two = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/9b80467c-18b5-4570-9b32-d66f86d71986/1787051525449.png',
  Three = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/9b80467c-18b5-4570-9b32-d66f86d71986/1787051559763.png',
  HarborTown = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/presets/painted-isometric/harbor-town.png',
  DustyCourtyard = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/presets/painted-isometric/dusty-courtyard.png',
}

export enum PaintedIsometricSrefLabel {
  One = 'Painted 1',
  Two = 'Painted 2',
  Three = 'Painted 3',
  HarborTown = 'Harbor town',
  DustyCourtyard = 'Dusty courtyard',
}

export enum PaintedIsometricSrefSetting {
  ModuleKey = '2d-canvas-painted-isometric-srefs',
  EnabledIdsKey = 'enabledIds',
}

export const PAINTED_ISOMETRIC_SREF_URLS = [
  PaintedIsometricSrefUrl.One,
  PaintedIsometricSrefUrl.Two,
  PaintedIsometricSrefUrl.Three,
] as const

export const PAINTED_ISOMETRIC_SREF_DEFAULT_ENABLED: readonly PaintedIsometricSrefId[] = [
  PaintedIsometricSrefId.One,
  PaintedIsometricSrefId.Two,
  PaintedIsometricSrefId.Three,
]

export const PAINTED_ISOMETRIC_SREF_CATALOG: readonly {
  id: PaintedIsometricSrefId
  url: PaintedIsometricSrefUrl
  label: PaintedIsometricSrefLabel
}[] = [
  {
    id: PaintedIsometricSrefId.One,
    url: PaintedIsometricSrefUrl.One,
    label: PaintedIsometricSrefLabel.One,
  },
  {
    id: PaintedIsometricSrefId.Two,
    url: PaintedIsometricSrefUrl.Two,
    label: PaintedIsometricSrefLabel.Two,
  },
  {
    id: PaintedIsometricSrefId.Three,
    url: PaintedIsometricSrefUrl.Three,
    label: PaintedIsometricSrefLabel.Three,
  },
  {
    id: PaintedIsometricSrefId.HarborTown,
    url: PaintedIsometricSrefUrl.HarborTown,
    label: PaintedIsometricSrefLabel.HarborTown,
  },
  {
    id: PaintedIsometricSrefId.DustyCourtyard,
    url: PaintedIsometricSrefUrl.DustyCourtyard,
    label: PaintedIsometricSrefLabel.DustyCourtyard,
  },
]
