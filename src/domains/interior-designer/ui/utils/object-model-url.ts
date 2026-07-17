import { DATA_URL_PREFIX } from '@/domains/interior-designer/constants/three-js'

export function isExternalModelUrl(url: string): boolean {
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith(DATA_URL_PREFIX)
  )
}
