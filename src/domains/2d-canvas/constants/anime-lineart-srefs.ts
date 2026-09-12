export enum AnimeLineartSrefId {
  CoralCave = 'coral-cave',
  ActionPages = 'action-pages',
  SalonPages = 'salon-pages',
  InkAtrium = 'ink-atrium',
  MangaPages = 'manga-pages',
}

export enum AnimeLineartSrefUrl {
  CoralCave = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/presets/anime-lineart/coral-cave.png',
  ActionPages = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/presets/anime-lineart/action-pages.png',
  SalonPages = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/presets/anime-lineart/salon-pages.png',
  InkAtrium = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/presets/anime-lineart/ink-atrium.png',
  MangaPages = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/presets/anime-lineart/manga-pages.png',
}

export enum AnimeLineartSrefLabel {
  CoralCave = 'Coral cave',
  ActionPages = 'Action pages',
  SalonPages = 'Salon pages',
  InkAtrium = 'Ink atrium',
  MangaPages = 'Manga pages',
}

export enum AnimeLineartSrefSetting {
  ModuleKey = '2d-canvas-anime-lineart-srefs',
  EnabledIdsKey = 'enabledIds',
}

export const ANIME_LINEART_SREF_DEFAULT_ENABLED: readonly AnimeLineartSrefId[] = [
  AnimeLineartSrefId.CoralCave,
  AnimeLineartSrefId.ActionPages,
  AnimeLineartSrefId.SalonPages,
]

export const ANIME_LINEART_SREF_CATALOG: readonly {
  id: AnimeLineartSrefId
  url: AnimeLineartSrefUrl
  label: AnimeLineartSrefLabel
}[] = [
  {
    id: AnimeLineartSrefId.CoralCave,
    url: AnimeLineartSrefUrl.CoralCave,
    label: AnimeLineartSrefLabel.CoralCave,
  },
  {
    id: AnimeLineartSrefId.ActionPages,
    url: AnimeLineartSrefUrl.ActionPages,
    label: AnimeLineartSrefLabel.ActionPages,
  },
  {
    id: AnimeLineartSrefId.SalonPages,
    url: AnimeLineartSrefUrl.SalonPages,
    label: AnimeLineartSrefLabel.SalonPages,
  },
  {
    id: AnimeLineartSrefId.InkAtrium,
    url: AnimeLineartSrefUrl.InkAtrium,
    label: AnimeLineartSrefLabel.InkAtrium,
  },
  {
    id: AnimeLineartSrefId.MangaPages,
    url: AnimeLineartSrefUrl.MangaPages,
    label: AnimeLineartSrefLabel.MangaPages,
  },
]
