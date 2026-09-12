export enum PixelArtSrefId {
  NeonGrotto = 'neon-grotto',
  MudVillage = 'mud-village',
  ForestCottage = 'forest-cottage',
  TentCamp = 'tent-camp',
  NightTemple = 'night-temple',
}

export enum PixelArtSrefUrl {
  NeonGrotto = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/presets/pixel-art/neon-grotto.png',
  MudVillage = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/presets/pixel-art/mud-village.png',
  ForestCottage = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/presets/pixel-art/forest-cottage.png',
  TentCamp = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/presets/pixel-art/tent-camp.png',
  NightTemple = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/presets/pixel-art/night-temple.png',
}

export enum PixelArtSrefLabel {
  NeonGrotto = 'Neon grotto',
  MudVillage = 'Mud village',
  ForestCottage = 'Forest cottage',
  TentCamp = 'Tent camp',
  NightTemple = 'Night temple',
}

export enum PixelArtSrefSetting {
  ModuleKey = '2d-canvas-pixel-art-srefs',
  EnabledIdsKey = 'enabledIds',
}

export enum PixelArtSrefBodyKey {
  EnabledIds = 'enabledIds',
  Items = 'items',
  CanEdit = 'canEdit',
  Enabled = 'enabled',
  Id = 'id',
  Url = 'url',
}

export { StyleRefCatalogToggleStatus as PixelArtSrefToggleStatus } from './style-ref-catalog'

export const PIXEL_ART_SREF_DEFAULT_ENABLED: readonly PixelArtSrefId[] = [
  PixelArtSrefId.MudVillage,
  PixelArtSrefId.ForestCottage,
  PixelArtSrefId.TentCamp,
]

export const PIXEL_ART_SREF_CATALOG: readonly {
  id: PixelArtSrefId
  url: PixelArtSrefUrl
  label: PixelArtSrefLabel
}[] = [
  {
    id: PixelArtSrefId.NeonGrotto,
    url: PixelArtSrefUrl.NeonGrotto,
    label: PixelArtSrefLabel.NeonGrotto,
  },
  {
    id: PixelArtSrefId.MudVillage,
    url: PixelArtSrefUrl.MudVillage,
    label: PixelArtSrefLabel.MudVillage,
  },
  {
    id: PixelArtSrefId.ForestCottage,
    url: PixelArtSrefUrl.ForestCottage,
    label: PixelArtSrefLabel.ForestCottage,
  },
  {
    id: PixelArtSrefId.TentCamp,
    url: PixelArtSrefUrl.TentCamp,
    label: PixelArtSrefLabel.TentCamp,
  },
  {
    id: PixelArtSrefId.NightTemple,
    url: PixelArtSrefUrl.NightTemple,
    label: PixelArtSrefLabel.NightTemple,
  },
]
