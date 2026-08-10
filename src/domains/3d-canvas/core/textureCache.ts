/**
 * Shared THREE.Texture cache with refcounting.
 * Consumers must release textures they acquire; wrap/repeat are applied on clones only.
 */

import * as THREE from 'three'

interface CacheEntry {
  texture: THREE.Texture
  refs: number
}

const textureCache = new Map<string, CacheEntry>()
const loader = new THREE.TextureLoader()

export interface CachedTextureOptions {
  wrapS?: THREE.Wrapping
  wrapT?: THREE.Wrapping
  repeat?: [number, number]
}

function applyOptions(texture: THREE.Texture, options?: CachedTextureOptions): THREE.Texture {
  if (!options) return texture
  if (options.wrapS !== undefined) texture.wrapS = options.wrapS
  if (options.wrapT !== undefined) texture.wrapT = options.wrapT
  if (options.repeat) texture.repeat.set(options.repeat[0], options.repeat[1])
  return texture
}

/**
 * Acquire a texture (shared base + optional clone when wrap/repeat are set).
 * Call `releaseCachedTexture` when the consumer unmounts.
 */
export const getCachedTexture = (
  url: string,
  options?: CachedTextureOptions
): THREE.Texture | null => {
  if (!url) return null

  const existing = textureCache.get(url)
  if (existing) {
    existing.refs += 1
    if (!options) {
      return existing.texture
    }
    const clone = existing.texture.clone()
    applyOptions(clone, options)
    return clone
  }

  const texture = loader.load(url)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  textureCache.set(url, { texture, refs: 1 })

  if (!options) {
    return texture
  }

  const clone = texture.clone()
  applyOptions(clone, {
    wrapS: options.wrapS ?? THREE.RepeatWrapping,
    wrapT: options.wrapT ?? THREE.RepeatWrapping,
    repeat: options.repeat,
  })
  return clone
}

/** Drop one reference; dispose shared texture when refs hit zero. Clones are disposed immediately. */
export function releaseCachedTexture(url: string, instance?: THREE.Texture | null): void {
  if (instance && textureCache.get(url)?.texture !== instance) {
    instance.dispose()
  }

  const entry = textureCache.get(url)
  if (!entry) return

  entry.refs -= 1
  if (entry.refs > 0) return

  entry.texture.dispose()
  textureCache.delete(url)
}

export function getTextureCacheSize(): number {
  return textureCache.size
}

/** Test helper — clear all entries. */
export function clearTextureCacheForTests(): void {
  for (const entry of textureCache.values()) {
    entry.texture.dispose()
  }
  textureCache.clear()
}
