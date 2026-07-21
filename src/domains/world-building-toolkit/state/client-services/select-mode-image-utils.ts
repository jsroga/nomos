import {
  CanvasContextType,
  ContentType,
  HtmlElementTag,
  ImageCrossOrigin,
  SelectModeErrorMessage,
  SelectModeLogMessage,
  UrlScheme,
} from '../../constants/select-mode-service'

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (url.startsWith(UrlScheme.Http)) {
      img.crossOrigin = ImageCrossOrigin.Anonymous
    }
    img.onload = () => resolve(img)
    img.onerror = e => reject(new Error(`Failed to load image at ${url}: ${e}`))
    img.src = url
  })
}

export async function fetchMaskAsDataUrl(
  maskUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<string | null> {
  try {
    console.log(SelectModeLogMessage.FetchingMaskFromUrl, maskUrl)

    const maskImg = await loadImage(maskUrl)

    const canvas = document.createElement(HtmlElementTag.Canvas)
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext(CanvasContextType.TwoD)
    if (!ctx) throw new Error(SelectModeErrorMessage.FailedToCreateCanvasForMask)

    ctx.drawImage(maskImg, 0, 0, targetWidth, targetHeight)

    const dataUrl = canvas.toDataURL(ContentType.Png)
    console.log(SelectModeLogMessage.ConvertedMaskToDataUrl, dataUrl.length)

    return dataUrl
  } catch (error) {
    console.error(SelectModeLogMessage.ErrorFindingBestMask, error)
    return null
  }
}

export async function resizeMask(
  maskDataUrl: string,
  _sourceWidth: number,
  _sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  try {
    const maskImg = await loadImage(maskDataUrl)

    const canvas = document.createElement(HtmlElementTag.Canvas)
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext(CanvasContextType.TwoD)
    if (!ctx) throw new Error(SelectModeErrorMessage.FailedToCreateCanvasForResizing)

    ctx.drawImage(maskImg, 0, 0, targetWidth, targetHeight)

    return canvas.toDataURL(ContentType.Png)
  } catch (error) {
    console.error(SelectModeLogMessage.ErrorResizingMask, error)
    throw error
  }
}
