'use client'

import { Play, Square, ExternalLink, Volume2 } from 'lucide-react'

interface YouTubePlayerProps {
  title: string
  artist: string
  youtubeUrl: string
  mood?: string
  isCurrentlyPlaying?: boolean
  onPlay: () => void
  onStop: () => void
}

/**
 * Extracts YouTube video ID from various URL formats
 */
function extractVideoId(url: string): string | null {
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

export function YouTubePlayer({
  title,
  artist,
  youtubeUrl,
  mood,
  isCurrentlyPlaying = false,
  onPlay,
  onStop,
}: YouTubePlayerProps) {
  const videoId = extractVideoId(youtubeUrl)

  return (
    <div className="flex items-center gap-3 p-2 bg-muted/10 border border-border rounded hover:bg-muted/20 transition-colors group">
      {/* Playback Controls */}
      <div className="flex items-center gap-1">
        {!isCurrentlyPlaying ? (
          <button
            onClick={e => {
              e.preventDefault()
              e.stopPropagation()
              onPlay()
            }}
            disabled={!videoId}
            className="p-1.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Play"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
        ) : (
          <>
            <button
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                onStop()
              }}
              className="p-1.5 rounded-md bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors"
              title="Stop"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Playing indicator */}
      {isCurrentlyPlaying && (
        <div className="flex items-center gap-1">
          <Volume2 className="w-3 h-3 text-cyan-400 animate-pulse" />
        </div>
      )}

      {/* Track Info */}
      <div className="flex-1 min-w-0 font-mono">
        <span className="text-sm text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground ml-2">— {artist}</span>
        {mood && <span className="text-xs text-muted-foreground/60 ml-1">({mood})</span>}
      </div>

      {/* External Link */}
      <a
        href={youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="p-1 text-muted-foreground hover:text-cyan-400 transition-colors"
        title="Open in YouTube"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  )
}

interface YouTubeEmbedPlayerProps {
  videoId: string
  onEnded?: () => void
}

/**
 * Hidden YouTube iframe player that plays audio
 */
export function YouTubeEmbedPlayer({ videoId }: YouTubeEmbedPlayerProps) {
  if (!videoId) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background/95 backdrop-blur-sm border border-cyan-500/30 rounded-lg shadow-lg overflow-hidden">
      <div className="p-2 bg-cyan-500/10 border-b border-cyan-500/20 flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
        <span className="text-xs text-cyan-400 font-mono">Now Playing</span>
      </div>
      <iframe
        width="280"
        height="158"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
        title="YouTube Audio Player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="block"
      />
    </div>
  )
}
