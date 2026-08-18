import sharp from 'sharp'
import { TileContext } from '@/shared/ai/types'
import {
  packedCanvasLayout,
  packedCropSpecFromLayout,
  neighborCount,
  PACKED_CANVAS_RGB,
  PACKED_HOLE_RGB,
  PACKED_NEIGHBOR_KEYS,
  neighborPresenceFromLoaded,
  type PackedCanvasLayout,
  type PackedCellDest,
  type PackedNeighborKey,
} from '@/shared/ai/context-pack-layout'
import { BufferEncoding, SharpFit, UrlScheme } from '@/shared/data/constants/protocol'
import {
  DataUrlSeparator,
  ImageServiceLog,
  SharpBlendMode,
} from '@/shared/data/server/constants/image-service'

export interface AssembledPackedContext {
  image: Buffer
  mask: Buffer
  cropRect: { x: number; y: number; width: number; height: number }
  packedWidth: number
  packedHeight: number
  loadedNeighborCount: number
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    if (url.startsWith(UrlScheme.Data)) {
      const base64 = url.includes(DataUrlSeparator.Base64Marker)
        ? url.split(DataUrlSeparator.Base64Marker)[1]
        : null
      if (!base64) return null
      return Buffer.from(base64, BufferEncoding.Base64)
    }
    const response = await fetch(url)
    if (!response.ok) return null
    return Buffer.from(await response.arrayBuffer())
  } catch (e) {
    console.error(`${ImageServiceLog.NeighborFetchFailed} ${url.substring(0, 80)}`, e)
    return null
  }
}

async function neighborTile(
  url: string | undefined,
  cellSize: number,
): Promise<Buffer | null> {
  if (!url) return null
  const buffer = await fetchImageBuffer(url)
  if (!buffer) return null
  return sharp(buffer).resize(cellSize, cellSize, { fit: SharpFit.Cover }).png().toBuffer()
}

async function compositeCell(
  layers: sharp.OverlayOptions[],
  tile: Buffer | null,
  dest: PackedCellDest | undefined,
): Promise<void> {
  if (!tile || !dest) return
  layers.push({ input: tile, left: dest.x, top: dest.y })
}

function presenceFromLoaded(
  loaded: Partial<Record<PackedNeighborKey, Buffer | null>>,
) {
  return neighborPresenceFromLoaded(loaded)
}

type LoadedNeighbors = Partial<Record<PackedNeighborKey, Buffer | null>>

async function loadNeighbors(
  context: TileContext,
  cellSize: number,
): Promise<LoadedNeighbors> {
  const loaded: LoadedNeighbors = {}
  await Promise.all(
    PACKED_NEIGHBOR_KEYS.map(async key => {
      loaded[key] = await neighborTile(context.neighbors[key]?.imageUrl, cellSize)
    }),
  )
  return loaded
}

async function paintPackedImage(
  layout: PackedCanvasLayout,
  loaded: LoadedNeighbors,
): Promise<Buffer> {
  const holeFill = await sharp({
    create: {
      width: layout.hole.width,
      height: layout.hole.height,
      channels: 4,
      background: { ...PACKED_HOLE_RGB, alpha: 1 },
    },
  })
    .png()
    .toBuffer()
  const layers: sharp.OverlayOptions[] = []
  for (const key of PACKED_NEIGHBOR_KEYS) {
    await compositeCell(layers, loaded[key] ?? null, layout[key])
  }
  layers.push({
    input: holeFill,
    left: layout.hole.x,
    top: layout.hole.y,
  })
  return sharp({
    create: {
      width: layout.width,
      height: layout.height,
      channels: 4,
      background: { ...PACKED_CANVAS_RGB, alpha: 1 },
    },
  })
    .composite(layers)
    .png()
    .toBuffer()
}

async function paintHoleMask(layout: PackedCanvasLayout): Promise<Buffer> {
  const maskBase = await sharp({
    create: {
      width: layout.width,
      height: layout.height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer()
  const transparentHole = await sharp({
    create: {
      width: layout.hole.width,
      height: layout.hole.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer()
  return sharp(maskBase)
    .composite([
      {
        input: transparentHole,
        top: layout.hole.y,
        left: layout.hole.x,
        blend: SharpBlendMode.DestOut,
      },
    ])
    .png()
    .toBuffer()
}

export async function assemblePackedContext(context: TileContext): Promise<AssembledPackedContext> {
  const requested = neighborPresenceFromLoaded({
    left: context.neighbors.left?.imageUrl,
    right: context.neighbors.right?.imageUrl,
    up: context.neighbors.up?.imageUrl,
    down: context.neighbors.down?.imageUrl,
    topLeft: context.neighbors.topLeft?.imageUrl,
    topRight: context.neighbors.topRight?.imageUrl,
    bottomLeft: context.neighbors.bottomLeft?.imageUrl,
    bottomRight: context.neighbors.bottomRight?.imageUrl,
  })
  const probeLayout = packedCanvasLayout(requested)
  const loaded = await loadNeighbors(context, probeLayout.cellSize)
  const layout = packedCanvasLayout(presenceFromLoaded(loaded))
  const spec = packedCropSpecFromLayout(layout)
  const [image, mask] = await Promise.all([paintPackedImage(layout, loaded), paintHoleMask(layout)])
  return {
    image,
    mask,
    cropRect: spec.cropRect,
    packedWidth: spec.packedWidth,
    packedHeight: spec.packedHeight,
    loadedNeighborCount: neighborCount(presenceFromLoaded(loaded)),
  }
}
