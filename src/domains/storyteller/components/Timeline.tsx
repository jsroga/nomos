'use client'

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Play, Pause, User, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PendingActions } from './PendingActions'
import { QuestionSession } from '../questions/types'
import { ActionHistoryEntry } from '../actions/types'

interface Beat {
  id: string
  sequence: number
  logline: string
  beatType: string
  status: string
}

interface CharacterSnapshot {
  characterId: string
  characterName: string
  stressLevel: number
  emotionalState: string
  transformationProgress: number
}

interface TimelineProps {
  episodeId: string | null
  beats: Beat[]
  onBeatSelect: (beatId: string | null) => void
  selectedBeatId: string | null
  pendingQuestions: QuestionSession[]
  recentActions: ActionHistoryEntry[]
}

// Beat type colors
const BEAT_COLORS: Record<string, string> = {
  setup: 'bg-blue-500',
  complication: 'bg-orange-500',
  revelation: 'bg-purple-500',
  decision: 'bg-yellow-500',
  consequence: 'bg-red-500',
  default: 'bg-muted-foreground',
}

export const Timeline: React.FC<TimelineProps> = ({
  episodeId,
  beats,
  onBeatSelect,
  selectedBeatId,
  pendingQuestions,
  recentActions,
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [snapshots, setSnapshots] = useState<CharacterSnapshot[]>([])
  const [hoveredBeat, setHoveredBeat] = useState<string | null>(null)

  // Sort beats by sequence
  const sortedBeats = [...beats].sort((a, b) => a.sequence - b.sequence)

  // Update current index when selectedBeatId changes
  useEffect(() => {
    if (selectedBeatId) {
      const index = sortedBeats.findIndex(b => b.id === selectedBeatId)
      if (index >= 0) setCurrentIndex(index)
    }
  }, [selectedBeatId, sortedBeats])

  // Fetch character snapshots for selected beat
  useEffect(() => {
    if (selectedBeatId && episodeId) {
      fetch(`/api/storyteller/timeline?episodeId=${episodeId}&beatId=${selectedBeatId}`)
        .then(res => res.json())
        .then(data => {
          if (data.snapshots) setSnapshots(data.snapshots)
        })
        .catch(err => console.error('Failed to fetch snapshots:', err))
    } else {
      setSnapshots([])
    }
  }, [selectedBeatId, episodeId])

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && sortedBeats.length > 0) {
      const timer = setInterval(() => {
        setCurrentIndex(prev => {
          const next = prev + 1
          if (next >= sortedBeats.length) {
            setIsPlaying(false)
            return prev
          }
          onBeatSelect(sortedBeats[next].id)
          return next
        })
      }, 2000)
      return () => clearInterval(timer)
    }
  }, [isPlaying, sortedBeats, onBeatSelect])

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1
      setCurrentIndex(newIndex)
      onBeatSelect(sortedBeats[newIndex].id)
    }
  }

  const handleNext = () => {
    if (currentIndex < sortedBeats.length - 1) {
      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)
      onBeatSelect(sortedBeats[newIndex].id)
    }
  }

  const handleBeatClick = (beatId: string, index: number) => {
    setCurrentIndex(index)
    onBeatSelect(beatId)
  }

  if (!episodeId) {
    return (
      <div className="h-32 border-t border-border bg-card/80 backdrop-blur flex items-center justify-center text-muted-foreground text-sm">
        Select an episode to view timeline
      </div>
    )
  }

  const currentBeat = sortedBeats[currentIndex]

  return (
    <div className="h-40 border-t border-border bg-card/95 backdrop-blur flex flex-col">
      {/* Timeline Header with Controls */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="h-7 w-7 p-0"
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-7 w-7 p-0"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNext}
            disabled={currentIndex >= sortedBeats.length - 1}
            className="h-7 w-7 p-0"
          >
            <ChevronRight size={16} />
          </Button>
          <span className="text-xs text-muted-foreground ml-2">
            Beat {currentIndex + 1} of {sortedBeats.length}
          </span>
        </div>

        {currentBeat && (
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium text-white ${BEAT_COLORS[currentBeat.beatType] || BEAT_COLORS.default}`}
            >
              {currentBeat.beatType}
            </span>
            <span className="text-xs text-muted-foreground max-w-[300px] truncate">
              {currentBeat.logline}
            </span>
          </div>
        )}
      </div>

      {/* Timeline Track */}
      <div className="flex-1 flex overflow-hidden">
        {/* Beat Track */}
        <div className="flex-1 px-4 py-2 overflow-x-auto">
          <div className="relative h-8 bg-muted/30 rounded-full flex items-center px-2">
            {/* Progress line */}
            <div
              className="absolute left-2 h-1 bg-primary/50 rounded-full transition-all duration-300"
              style={{
                width:
                  sortedBeats.length > 1
                    ? `${(currentIndex / (sortedBeats.length - 1)) * 100}%`
                    : '0%',
              }}
            />

            {/* Beat markers */}
            <div className="relative w-full flex justify-between">
              {sortedBeats.map((beat, index) => (
                <button
                  key={beat.id}
                  onClick={() => handleBeatClick(beat.id, index)}
                  onMouseEnter={() => setHoveredBeat(beat.id)}
                  onMouseLeave={() => setHoveredBeat(null)}
                  className={`relative w-4 h-4 rounded-full transition-all duration-200 ${index === currentIndex
                      ? 'scale-150 ring-2 ring-primary ring-offset-2 ring-offset-card'
                      : 'hover:scale-125'
                    } ${BEAT_COLORS[beat.beatType] || BEAT_COLORS.default}`}
                  title={beat.logline}
                >
                  {hoveredBeat === beat.id && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover border border-border rounded text-xs whitespace-nowrap z-[80] shadow-lg">
                      {beat.logline.slice(0, 50)}...
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Actions (Replaces Character States) */}
        <div className="w-80 border-l border-border bg-card/50 overflow-y-auto">
          <PendingActions
            pendingQuestions={pendingQuestions}
            recentActions={recentActions}
            className="p-2"
          />
        </div>
      </div>
    </div>
  )
}
