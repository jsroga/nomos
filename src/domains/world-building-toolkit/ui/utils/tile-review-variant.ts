export function findVariantIndex(variantUrls: string[], selectedUrl: string): number {
  return variantUrls.findIndex(
    url => url === selectedUrl || url.split('?')[0] === selectedUrl.split('?')[0]
  )
}
