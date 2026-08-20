import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { FsDirectory, SharpFit, UrlScheme } from '@/shared/data/constants/protocol'
import {
  COMBINED_STORYBOARD_ERROR,
  beatsWithImageUrl,
  type CombinedStoryboardBeat,
} from './generate-combined-storyboard-helpers'
import {
  CONTACT_SHEET_BADGE_FILL,
  CONTACT_SHEET_BG,
  CONTACT_SHEET_NUMBER_FILL,
  CONTACT_SHEET_SVG_NS,
  contactSheetLayout,
  type ContactSheetCell,
} from './constants/storyboard-video-sheet'

function isRemoteUrl(url: string): boolean {
  return (
    url.startsWith(`${UrlScheme.Https}://`) || url.startsWith(`${UrlScheme.Http}://`)
  )
}

export function beatImageDiskPath(projectId: string, imageUrl: string): string {
  const trimmed = imageUrl.trim().replace(/^\//, '')
  if (trimmed.startsWith(`${FsDirectory.Projects}/`)) {
    return path.join(process.cwd(), FsDirectory.Public, trimmed)
  }
  return path.join(
    process.cwd(),
    FsDirectory.Public,
    FsDirectory.Projects,
    projectId,
    trimmed,
  )
}

async function loadBeatImageBytes(projectId: string, imageUrl: string): Promise<Buffer> {
  if (isRemoteUrl(imageUrl)) {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(
        `${COMBINED_STORYBOARD_ERROR.DownloadBeatImage} (${response.status}): ${imageUrl}`,
      )
    }
    return Buffer.from(await response.arrayBuffer())
  }
  const diskPath = beatImageDiskPath(projectId, imageUrl)
  if (!fs.existsSync(diskPath)) {
    throw new Error(`${COMBINED_STORYBOARD_ERROR.MissingBeatFile}: ${diskPath}`)
  }
  return fs.readFileSync(diskPath)
}

function numberBadgeSvg(label: string, width: number, height: number): Buffer {
  const svg = `<svg width="${width}" height="${height}" xmlns="${CONTACT_SHEET_SVG_NS}"><rect x="8" y="8" width="40" height="24" rx="4" fill="${CONTACT_SHEET_BADGE_FILL}"/><text x="28" y="25" text-anchor="middle" fill="${CONTACT_SHEET_NUMBER_FILL}" font-size="14" font-family="sans-serif">${label}</text></svg>`
  return Buffer.from(svg)
}

async function cellImageBuffer(
  projectId: string,
  beat: CombinedStoryboardBeat,
  cell: ContactSheetCell,
): Promise<Buffer> {
  const imageUrl = beat.imageUrl?.trim()
  if (!imageUrl) {
    throw new Error(COMBINED_STORYBOARD_ERROR.MissingBeatUrl)
  }
  const downloaded = await loadBeatImageBytes(projectId, imageUrl)
  return sharp(downloaded)
    .resize(cell.width, cell.height, { fit: SharpFit.Contain, background: CONTACT_SHEET_BG })
    .png()
    .toBuffer()
}

export async function composeStoryboardContactSheet(
  projectId: string,
  beats: CombinedStoryboardBeat[],
): Promise<Buffer> {
  const imaged = beatsWithImageUrl(beats)
  const layout = contactSheetLayout(imaged.length)
  const composites: sharp.OverlayOptions[] = []

  for (const cell of layout.cells) {
    const beat = imaged[cell.index]
    if (!beat) continue
    const label = String(cell.index + 1)
    const cellBytes = await cellImageBuffer(projectId, beat, cell)
    composites.push({ input: cellBytes, left: cell.left, top: cell.top })
    composites.push({
      input: numberBadgeSvg(label, cell.width, cell.height),
      left: cell.left,
      top: cell.top,
    })
  }

  return sharp({
    create: {
      width: layout.width,
      height: layout.height,
      channels: 3,
      background: CONTACT_SHEET_BG,
    },
  })
    .composite(composites)
    .png()
    .toBuffer()
}
