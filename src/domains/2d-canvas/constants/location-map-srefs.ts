export enum LocationMapSrefId {
  ParchmentWilds = 'parchment-wilds',
  HarborCity = 'harbor-city',
  NamedKingdoms = 'named-kingdoms',
  ColoredKingdoms = 'colored-kingdoms',
}

export enum LocationMapSrefUrl {
  ParchmentWilds = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/presets/location-map/parchment-wilds.png',
  HarborCity = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/presets/location-map/harbor-city.png',
  NamedKingdoms = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/presets/location-map/named-kingdoms.png',
  ColoredKingdoms = 'https://5xsd83djscteudrw.public.blob.vercel-storage.com/style-refs/presets/location-map/colored-kingdoms.png',
}

export enum LocationMapSrefLabel {
  ParchmentWilds = 'Parchment wilds',
  HarborCity = 'Harbor city',
  NamedKingdoms = 'Named kingdoms',
  ColoredKingdoms = 'Colored kingdoms',
}

export enum LocationMapSrefSetting {
  ModuleKey = '2d-canvas-location-map-srefs',
  EnabledIdsKey = 'enabledIds',
}

export const LOCATION_MAP_SREF_DEFAULT_ENABLED: readonly LocationMapSrefId[] = [
  LocationMapSrefId.ParchmentWilds,
  LocationMapSrefId.HarborCity,
  LocationMapSrefId.NamedKingdoms,
]

export const LOCATION_MAP_SREF_CATALOG: readonly {
  id: LocationMapSrefId
  url: LocationMapSrefUrl
  label: LocationMapSrefLabel
}[] = [
  {
    id: LocationMapSrefId.ParchmentWilds,
    url: LocationMapSrefUrl.ParchmentWilds,
    label: LocationMapSrefLabel.ParchmentWilds,
  },
  {
    id: LocationMapSrefId.HarborCity,
    url: LocationMapSrefUrl.HarborCity,
    label: LocationMapSrefLabel.HarborCity,
  },
  {
    id: LocationMapSrefId.NamedKingdoms,
    url: LocationMapSrefUrl.NamedKingdoms,
    label: LocationMapSrefLabel.NamedKingdoms,
  },
  {
    id: LocationMapSrefId.ColoredKingdoms,
    url: LocationMapSrefUrl.ColoredKingdoms,
    label: LocationMapSrefLabel.ColoredKingdoms,
  },
]
