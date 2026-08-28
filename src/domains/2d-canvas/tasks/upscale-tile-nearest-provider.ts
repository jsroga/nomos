import { logger } from '@trigger.dev/sdk'
import { BufferEncoding } from '@/shared/data/constants/protocol'
import { TOPAZ_MEGAPIXEL_DIVISOR, resolveNearestNeighbourSize } from '../constants/topaz-upscale'

export async function upscaleNearestNeighbour(imageBase64: string): Promise<string> {
  const sharp = (await import('sharp')).default
  const buffer = Buffer.from(
    imageBase64.replace(/^data:image\/\w+;base64,/, ''),
    BufferEncoding.Base64
  )
  const meta = await sharp(buffer).metadata()
  const size = resolveNearestNeighbourSize(meta.width ?? 1, meta.height ?? 1)
  logger.info('Nearest-neighbour upscale', {
    width: size.width,
    height: size.height,
    megapixels: (size.width * size.height) / TOPAZ_MEGAPIXEL_DIVISOR,
  })
  const out = await sharp(buffer)
    .resize(size.width, size.height, { kernel: 'nearest' })
    .png()
    .toBuffer()
  return out.toString(BufferEncoding.Base64)
}
