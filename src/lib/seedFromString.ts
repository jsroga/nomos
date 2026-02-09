/**
 * Generates a deterministic integer seed from a string.
 * Uses a simple hash algorithm (djb2) to convert any string to a positive integer.
 * This is useful for reproducible AI generation results when using the same master prompt.
 */
export function seedFromString(str: string): number {
  if (!str || str.trim() === '') {
    // Return a default seed if string is empty
    return 42
  }

  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) + hash) ^ char // hash * 33 ^ char
  }

  // Ensure positive integer within Meshy's valid range
  // Meshy accepts seeds as integers, typically positive
  return Math.abs(hash) % 2147483647 // Max 32-bit signed integer
}

/**
 * Combines multiple strings into a single seed.
 * Useful for combining master prompt with object-specific prompt.
 */
function combinedSeed(...strings: string[]): number {
  return seedFromString(strings.filter(Boolean).join('|'))
}
