import { useState, type FC } from 'react'
import { Music } from 'lucide-react'
import { SoundtrackTrack } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { YouTubePlayer, YouTubeEmbedPlayer } from '../../YouTubePlayer'
import { extractVideoId } from '@/domains/storyteller/core/utils/youtube-utils'
import { useBible } from './BibleContext'
import { BibleSectionHeader, BibleSectionShell } from './BibleSectionChrome'
import { bibleSectionItems } from '../utils/bible-section-items'

interface BibleSoundtracksProps {}

const SoundtrackList: FC<{
  tracks: SoundtrackTrack[]
  playingTrackIndex: number | null
  playingVideoId: string | null
  onPlay: (track: SoundtrackTrack, index: number) => void
  onStop: () => void
}> = ({ tracks, playingTrackIndex, playingVideoId, onPlay, onStop }) => (
  <div className="space-y-1">
    {tracks.map((track, i) => (
      <YouTubePlayer
        key={i}
        title={track.title}
        artist={track.artist}
        youtubeUrl={track.youtubeUrl}
        mood={track.mood || undefined}
        isCurrentlyPlaying={playingTrackIndex === i}
        onPlay={() => onPlay(track, i)}
        onStop={onStop}
      />
    ))}
    {playingVideoId && <YouTubeEmbedPlayer videoId={playingVideoId} onEnded={onStop} />}
  </div>
)

const SoundtrackDisplay: FC<{
  moodSoundtrack: string
  tracks: SoundtrackTrack[]
  playingTrackIndex: number | null
  playingVideoId: string | null
  onPlay: (track: SoundtrackTrack, index: number) => void
  onStop: () => void
}> = ({ moodSoundtrack, tracks, playingTrackIndex, playingVideoId, onPlay, onStop }) => (
  <div className="space-y-2">
    {moodSoundtrack && (
      <div className="p-3 bg-muted/10 border border-border rounded">
        <span className="text-sm text-muted-foreground font-mono">{moodSoundtrack}</span>
      </div>
    )}
    {tracks.length > 0 ? (
      <SoundtrackList
        tracks={tracks}
        playingTrackIndex={playingTrackIndex}
        playingVideoId={playingVideoId}
        onPlay={onPlay}
        onStop={onStop}
      />
    ) : (
      !moodSoundtrack && (
        <div className="p-3 border border-dashed border-border rounded text-sm text-muted-foreground font-mono italic">
          No soundtrack defined.
        </div>
      )
    )}
  </div>
)

const SoundtrackEditForm: FC<{
  moodSoundtrack: string
  onChange: (value: string) => void
}> = ({ moodSoundtrack, onChange }) => (
  <div className="space-y-2">
    <input
      type="text"
      className="w-full p-2 bg-background border border-border rounded text-sm font-mono focus:ring-1 focus:ring-primary/50 outline-none"
      value={moodSoundtrack}
      onChange={e => onChange(e.target.value)}
      placeholder="General mood/atmosphere description..."
    />
    <p className="text-xs text-muted-foreground font-mono">
      Soundtracks generated via refresh button.
    </p>
  </div>
)

function useSoundtrackPlayback() {
  const [playingTrackIndex, setPlayingTrackIndex] = useState<number | null>(null)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)

  const handlePlayTrack = (track: SoundtrackTrack, index: number) => {
    const videoId = extractVideoId(track.youtubeUrl)
    if (!videoId) return
    setPlayingTrackIndex(index)
    setPlayingVideoId(videoId)
  }

  const handleStopTrack = () => {
    setPlayingTrackIndex(null)
    setPlayingVideoId(null)
  }

  return { playingTrackIndex, playingVideoId, handlePlayTrack, handleStopTrack }
}

export const BibleSoundtracks: FC<BibleSoundtracksProps> = () => {
  const {
    storyPlan,
    isEditing,
    localPlan,
    updateLocalPlan,
    isReadOnly,
    onSendMessage,
    loadingSections,
    pendingActions,
  } = useBible()
  const { playingTrackIndex, playingVideoId, handlePlayTrack, handleStopTrack } =
    useSoundtrackPlayback()

  const isLoading = loadingSections?.soundtracks?.loading ?? false
  const pendingAction = pendingActions?.soundtracks

  return (
    <BibleSectionShell
      isLoading={isLoading}
      loadingMessage="Generating soundtracks..."
      spinnerClassName="text-cyan-400"
      pendingAction={pendingAction}
    >
      <BibleSectionHeader
        icon={<Music className="w-5 h-5 text-cyan-400/80" />}
        title="Soundtrack"
        isReadOnly={isReadOnly}
        isLoading={isLoading}
        onGenerate={
          onSendMessage
            ? () =>
                onSendMessage(
                  'Suggest 3-5 BRAND NEW real YouTube soundtrack recommendations for this world. For each track, provide the song title, artist name, and actual YouTube URL. Choose music that reinforces the tone and atmosphere. IMPORTANT: Take a completely new, unexpected creative direction and do NOT repeat previous suggestions.',
                  'soundtracks'
                )
            : undefined
        }
        generateTitle="Generate Soundtracks"
      />
      {isEditing ? (
        <SoundtrackEditForm
          moodSoundtrack={localPlan.moodSoundtrack || ''}
          onChange={value => updateLocalPlan({ moodSoundtrack: value })}
        />
      ) : (
        <SoundtrackDisplay
          moodSoundtrack={localPlan.moodSoundtrack || storyPlan.moodSoundtrack || ''}
          tracks={bibleSectionItems<SoundtrackTrack>(
            localPlan.soundtracks,
            storyPlan.soundtracks,
            isEditing,
          )}
          playingTrackIndex={playingTrackIndex}
          playingVideoId={playingVideoId}
          onPlay={handlePlayTrack}
          onStop={handleStopTrack}
        />
      )}
    </BibleSectionShell>
  )
}
