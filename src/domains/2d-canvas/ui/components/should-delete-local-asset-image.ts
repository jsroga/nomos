import { isPublicHttpUrl } from '@/shared/data/is-public-http-url'

export function shouldDeleteLocalAssetImage(filename: string): boolean {
  return !isPublicHttpUrl(filename)
}
