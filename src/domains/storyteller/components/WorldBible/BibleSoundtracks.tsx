import React, { useState } from 'react'
import { Music, RefreshCw, Loader2 } from 'lucide-react'
import { SoundtrackTrack } from '../../schemas/agent-schemas'
import { YouTubePlayer, YouTubeEmbedPlayer } from '../YouTubePlayer'
import { extractVideoId } from '../../utils/youtube-utils'

import { useBible } from './BibleContext'
import { SectionPendingOverlay } from './SectionPendingOverlay'

interface BibleSoundtracksProps {}

export const BibleSoundtracks: React.FC<BibleSoundtracksProps> = () => {
  const {
    storyPlan,
    isEditing,
    localPlan,
    updateLocalPlan: onChange,
    isReadOnly,
    onSendMessage,
    loadingSections,
    pendingActions,
  } = useBible()
  const [playingTrackIndex, setPlayingTrackIndex] = useState<number | null>(null)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)

  // Check if soundtracks section is loading or has pending action
  const isLoading = loadingSections?.soundtracks?.loading ?? false
  const pendingAction = pendingActions?.soundtracks

  return (
    <section className={isLoading || pendingAction ? 'relative' : ''}>
      {/* Pending action overlay with approve/reject buttons */}
      {pendingAction && (
        <SectionPendingOverlay pendingAction={pendingAction} onReview={pendingAction.onReview} />
      )}

      {/* Loading overlay with shimmer */}
      {isLoading && !pendingAction && (
        <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm rounded-lg flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Generating soundtracks...</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-cyan-400/80" />
          <h3 className="font-syne font-bold text-lg">Soundtrack</h3>
        </div>
        {!isReadOnly && onSendMessage && (
          <button
            onClick={() =>
              onSendMessage?.(
                'Suggest 3-5 real YouTube soundtrack recommendations for this world. For each track, provide the song title, artist name, and actual YouTube URL. Choose music that reinforces the tone and atmosphere.',
                'soundtracks'
              )
            }
            className={`p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105 ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
            title="Generate Soundtracks"
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <input
            type="text"
            className="w-full p-2 bg-background border border-border rounded text-sm font-mono focus:ring-1 focus:ring-primary/50 outline-none"
            value={localPlan.moodSoundtrack || ''}
            onChange={e => onChange('moodSoundtrack', e.target.value as any)}
            placeholder="General mood/atmosphere description..."
          />
          <p className="text-xs text-muted-foreground font-mono">
            Soundtracks generated via refresh button.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Legacy mood description */}
          {storyPlan.moodSoundtrack && (
            <div className="p-3 bg-muted/10 border border-border rounded">
              <span className="text-sm text-muted-foreground font-mono">
                {storyPlan.moodSoundtrack}
              </span>
            </div>
          )}

          {/* YouTube Tracks */}
          {storyPlan.soundtracks && storyPlan.soundtracks.length > 0 ? (
            <div className="space-y-1">
              {storyPlan.soundtracks.map((track: SoundtrackTrack, i: number) => (
                <YouTubePlayer
                  key={i}
                  title={track.title}
                  artist={track.artist}
                  youtubeUrl={track.youtubeUrl}
                  mood={track.mood}
                  isCurrentlyPlaying={playingTrackIndex === i}
                  onPlay={() => {
                    const videoId = extractVideoId(track.youtubeUrl)
                    if (videoId) {
                      setPlayingTrackIndex(i)
                      setPlayingVideoId(videoId)
                    }
                  }}
                  onStop={() => {
                    setPlayingTrackIndex(null)
                    setPlayingVideoId(null)
                  }}
                />
              ))}

              {/* Floating YouTube Player */}
              {playingVideoId && (
                <YouTubeEmbedPlayer
                  videoId={playingVideoId}
                  onEnded={() => {
                    setPlayingTrackIndex(null)
                    setPlayingVideoId(null)
                  }}
                />
              )}
            </div>
          ) : (
            !storyPlan.moodSoundtrack && (
              <div className="p-3 border border-dashed border-border rounded text-sm text-muted-foreground font-mono italic">
                No soundtrack defined.
              </div>
            )
          )}
        </div>
      )}
    </section>
  )
}
