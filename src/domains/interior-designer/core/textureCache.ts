/**
 * Texture Cache Utility
 *
 * Singleton cache for THREE.js textures to prevent duplicate loading
 * and reduce memory usage across multiple mesh components.
 */

import * as THREE from 'three'

const textureCache = new Map<string, THREE.Texture>()
const loadingPromises = new Map<string, Promise<THREE.Texture>>()
const loader = new THREE.TextureLoader()

/**
 * Get or load a texture from the cache.
 * If the texture is already loaded, returns it immediately.
 * If loading, waits for the existing load to complete.
 *
 * @param url - The texture URL to load
 * @param options - Optional texture configuration
 * @returns The loaded texture
 */
export const getCachedTexture = (
  url: string,
  options?: {
    wrapS?: THREE.Wrapping
    wrapT?: THREE.Wrapping
    repeat?: [number, number]
  }
): THREE.Texture | null => {
  if (!url) return null

  // Check cache first
  if (textureCache.has(url)) {
    const texture = textureCache.get(url)!
    // Apply options if provided (in case they differ)
    if (options) {
      if (options.wrapS !== undefined) texture.wrapS = options.wrapS
      if (options.wrapT !== undefined) texture.wrapT = options.wrapT
      if (options.repeat) texture.repeat.set(options.repeat[0], options.repeat[1])
    }
    return texture
  }

  // Load and cache
  const texture = loader.load(url)
  texture.wrapS = options?.wrapS ?? THREE.RepeatWrapping
  texture.wrapT = options?.wrapT ?? THREE.RepeatWrapping
  if (options?.repeat) {
    texture.repeat.set(options.repeat[0], options.repeat[1])
  }

  textureCache.set(url, texture)
  return texture
}
