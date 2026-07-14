/** ImageService tile assembly and style analysis wire values. */

export enum TileNeighborEdge {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right',
  TopLeft = 'topLeft',
  TopRight = 'topRight',
  BottomLeft = 'bottomLeft',
  BottomRight = 'bottomRight',
}

export enum ImageStyleBrightness {
  Bright = 'bright',
  Medium = 'medium',
  Dark = 'dark',
}

export enum ImageStyleWarmth {
  Warm = 'warm',
  Neutral = 'neutral',
  Cool = 'cool',
}

export enum SharpBlendMode {
  DestOut = 'dest-out',
}

export enum ImageServiceLog {
  NeighborFetchFailed = '[ImageService] Failed to fetch neighbor image:',
}

export enum DataUrlSeparator {
  Base64Marker = ';base64,',
}
