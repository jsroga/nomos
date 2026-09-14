export enum GenerationPromptStyle {
  ConsistentArtStyle = 'consistent art style',
}

export enum GenerationPromptCopy {
  MaskedCenterTile =
    'Edit only the masked center tile so it becomes a seamless continuation of the surrounding neighbor context.',
  MidjourneyGreyFill = 'Fill grey space seamlessly to match surrounding edges --q 2',
  MidjourneyUpscale =
    'Preserve exact structure, composition, and layout. Do not change any shapes, objects, or positioning. Only enhance resolution, sharpness, and fine details. Isometric view with seamless tileable edges matching on all sides. --stylize 0 --q 2',
  StabilityUpscale = 'upscale maintaining the same style, high quality, detailed, sharp',
  FirstTileCroppedFragment =
    'rendered as a cropped fragment of a much larger continuous world.',
  FirstTileOverheadPrefix = 'Overhead view of',
  FirstTileFrameFill =
    'The image fills the entire square frame from edge to edge. Objects are cut off by all four frame edges mid-shape. No sky, no horizon, no background, no empty corners.',
  FollowUpGreyCenter = 'Fill the grey center to continue the surrounding world:',
  FollowUpNoBorders = 'Ensure continuous lines and matching lighting. Do not generate borders or frames.',
  FollowUpGeminiConstraints =
    'The gray areas outside the magenta are unconstrained empty borders with no adjacent images — do not fill or alter them. The non-gray, non-magenta areas are neighboring images — continue their colors, lines, and lighting at every edge where they touch the magenta area. Ensure continuous lines and matching lighting. Do not alter any non-magenta pixels. Do not add borders or frames.',
  FollowUpAvoidPrefix = 'Avoid:',
  TileDescriptionDirectivePrefix = '!imporant: image should show:',
  TileDescriptionDirectiveSuffix = '!',
  FollowUpInpaintGraySquare =
    'Inpaint the central gray square to connect with the surrounding edge context.',
  FollowUpInpaintMagenta =
    'Inpaint the bright magenta/pink square in the center of this image. The magenta marks exactly where new content must go — replace ONLY the magenta pixels.',
  FollowUpContinueNeighborWorld = 'Generate an image that continues the neighboring world.',
  FollowUpFillMatchEdges = 'Fill to match surrounding edges.',
}

export enum TileNeighborEdge {
  Left = 'left',
  Right = 'right',
  Up = 'up',
  Down = 'down',
}

export enum FollowUpApiframeCopy {
  RoleLeft =
    'The packed neighbor tile is immediately to the LEFT. Generate a NEW 1:1 square that continues the same world to the RIGHT of that image.',
  RoleRight =
    'The packed neighbor tile is immediately to the RIGHT. Generate a NEW 1:1 square that continues the same world to the LEFT of that image.',
  RoleUp =
    'The packed neighbor tile is immediately ABOVE. Generate a NEW 1:1 square that continues the same world BELOW that image.',
  RoleDown =
    'The packed neighbor tile is immediately BELOW. Generate a NEW 1:1 square that continues the same world ABOVE that image.',
  MatchContract =
    'Match the packed canvas camera, scale, horizon, and lighting. Streets, building walls, ground texture, and vanishing lines must continue across the shared edge at the same pixel scale. Objects that cross the seam are cut by that edge, not restarted. Do not restyle existing neighbor pixels.',
  DoNotCopy =
    'Do not reproduce, mirror, or duplicate the packed neighbor canvas. This is the next cell, not a remix of the same cell.',
  FillSquare =
    'Every pixel of the square is scene content. Objects are cut off by all four frame edges mid-shape. No sky or horizon band unless the neighbor already shows one at that edge.',
  PackedWorld =
    'Neighboring world tiles are packed around one grey cell. Paint the missing tile into that grey cell. Return the entire packed canvas at the same layout — not a cropped square.',
  PackedKeepNeighbors =
    'Non-grey pixels are finished neighbor tiles. Copy them through unchanged at the same zoom and position. Do not zoom, reframe, restyle, or stretch those neighbors. Continue streets, walls, ground texture, and lighting across every edge where grey meets a neighbor.',
}

export enum TileImageRoleLabel {
  Image = 'IMAGE',
}

export enum TileImageRoleJoin {
  And = ' and ',
  FinalAnd = ', and ',
}

export enum TileImageRoleSeparator {
  Line = '\n',
}

export enum TileImageRoleToken {
  Image = '{image}',
  Images = '{images}',
}

export enum TileImageRoleCopy {
  FirstTileScene =
    'Scene content comes from the text prompt. Designated style images are appearance references only.',
  PackedContext =
    '{image} is the packed neighboring world canvas. It supplies layout, camera, neighboring structures and connections. Paint the missing tile into the grey cell. Return the entire {image} canvas at the same layout — not a cropped square. Non-grey pixels on {image} are finished neighbor tiles. Copy them through unchanged at the same zoom and position. Do not zoom, reframe, restyle, or stretch those neighbors. Continue streets, walls, ground texture, and lighting across every edge where grey meets a neighbor. Do not use {image} as an appearance or style reference for the grey cell.',
  ExistingTile =
    '{image} is the current tile. Keep its layout, camera, objects, architecture, and composition. Do not zoom, reframe, crop, or rearrange it. Do not use {image} as a style reference — it is content only.',
  RestyleKeepLayout =
    'Keep the existing tile’s layout, geometry, objects, and composition. Change only appearance to match the style images.',
  SharedAppearanceOne = '{images} forms a shared appearance reference.',
  SharedAppearanceMany = '{images} form a shared appearance reference.',
  StyleTransfer =
    'Transfer only artistic medium, brushwork or linework, texture, color treatment, contrast and shading technique. Do not transfer their objects, architecture, scenery, silhouettes, spatial arrangement or composition. Do not create separate panels or copy any style image’s scene.',
}

export enum FollowUpApiframeAvoid {
  Border = 'border',
  Frame = 'frame',
  Vignette = 'vignette',
  WhiteBackground = 'white background',
  DiamondShape = 'diamond shape',
  IsolatedObject = 'isolated object',
  DropShadow = 'drop shadow',
  UiIcon = 'ui icon',
  Text = 'text',
  Watermark = 'watermark',
  EmptyCorners = 'empty corners',
  HexagonalCrop = 'hexagonal crop',
  DiamondCrop = 'diamond crop',
  Letterbox = 'letterbox',
  Sticker = 'sticker',
  FloatingTile = 'floating tile',
  IsometricCard = 'isometric card on blank canvas',
}

export enum CreativityPromptLevel {
  VeryConservative =
    'VERY CONSERVATIVE - preserve exact colors, textures, and details. Only increase resolution with minimal interpretation. Do not add or change any visual elements.',
  Conservative =
    'CONSERVATIVE - maintain original style and colors closely. Subtle enhancement of existing details only. Preserve all visual elements as they are.',
  Balanced =
    'BALANCED - enhance existing details and textures while keeping the original style. May add subtle refinements to existing elements.',
  Creative =
    'CREATIVE - freely enhance details, textures, and lighting. Add richness to existing elements while maintaining overall structure and composition.',
  MaximumFreedom =
    'MAXIMUM FREEDOM - full creative liberty on details, textures, lighting, and fidelity. Add rich details and enhancements freely. Only preserve the core structure and composition.',
}

export const CREATIVITY_PROMPT_PREFIX = 'CREATIVITY LEVEL:'
