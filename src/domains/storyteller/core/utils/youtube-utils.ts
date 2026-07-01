/**
 * Extracts YouTube video ID from various URL formats
 */
export function extractVideoId(url: string | null | undefined): string | null {
  if (!url) return null

  // Handle youtu.be shorts
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (shortMatch) return shortMatch[1]

  // Handle youtube.com/watch?v=
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (watchMatch) return watchMatch[1]

  // Handle youtube.com/embed/
  const embedMatch = url.match(/embed\/([a-zA-Z0-9_-]{11})/)
  if (embedMatch) return embedMatch[1]

  return null
}
