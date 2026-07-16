import {
  BufferEncoding,
  ImageFileExtension,
  ImageMimeType,
  PrepareImageDataUrlSeparator,
  PrepareImageError,
  PrepareImagePathPrefix,
  PrepareImagePublicDir,
  UrlScheme,
} from '../constants/meshy-generation-wire'

export async function prepareImageUrl(imageUrl: string): Promise<string> {
  if (!imageUrl.startsWith(PrepareImagePathPrefix.Projects)) {
    return imageUrl
  }

  const fs = await import('fs')
  const path = await import('path')

  const filePath = path.join(process.cwd(), PrepareImagePublicDir.Public, imageUrl)

  if (!fs.existsSync(filePath)) {
    throw new Error(`${PrepareImageError.NotFoundPrefix} ${imageUrl}`)
  }

  const fileBuffer = fs.readFileSync(filePath)
  const base64 = fileBuffer.toString(BufferEncoding.Base64)
  const mimeType = imageUrl.endsWith(ImageFileExtension.Png)
    ? ImageMimeType.Png
    : ImageMimeType.Jpeg
  return `${UrlScheme.Data}${mimeType}${PrepareImageDataUrlSeparator}${base64}`
}
