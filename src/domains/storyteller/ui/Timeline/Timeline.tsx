'use client'

import React, { useState, useEffect, memo, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Play, Pause, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/Button'
import {
  ButtonSizeKey,
  ButtonVariantKey,
} from '@/components/Button/constants/button-styles'

import { QuestionSession } from '@/domains/storyteller/core/types/action-types'
import { fetchStorytellerTimeline } from '@/domains/storyteller/core/io/storyteller.api'
import { recordArrayFromJson, readString, readNumber } from '@/shared/data/json-guards'
import { browserStorage } from '@/shared/data/browser-storage'
import {
  TIMELINE_BEAT_COLORS,
  TIMELINE_FETCH_SNAPSHOTS_FAILED_LOG,
  TimelineStorageKey,
  TimelineStorageValue,
} from './constants/timeline'

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

export interface TimelineProps {
  episodeId: string | null
  beats: Beat[]
  onBeatSelect: (beatId: string | null) => void
  selectedBeatId: string | null
  pendingQuestions: QuestionSession[]
}

// Beat type colors
const BEAT_COLORS = TIMELINE_BEAT_COLORS

// Memoized beat item component to prevent unnecessary re-renders
memo(function BeatItem({
  beat,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}: {
  beat: Beat
  isSelected: boolean
  isHovered: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}) {
  return (
    <button
      className={`relative flex-shrink-0 w-8 h-8 rounded-full transition-all duration-200 ${
        BEAT_COLORS[beat.beatType] || BEAT_COLORS.default
      } ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : ''} ${
        isHovered ? 'scale-105' : ''
      }`}
      onClick={() => onSelect(beat.id)}
      onMouseEnter={() => onHover(beat.id)}
      onMouseLeave={() => onHover(null)}
      title={beat.logline}
    >
      <span className="text-[10px] font-bold text-white">{beat.sequence}</span>
    </button>
  )
})

const Timeline: React.FC<TimelineProps> = memo(function Timeline({
  episodeId,
  beats,
  onBeatSelect,
  selectedBeatId,
  pendingQuestions: _pendingQuestions,
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [_snapshots, setSnapshots] = useState<CharacterSnapshot[]>([])
  const [hoveredBeat, setHoveredBeat] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = browserStorage.getString(TimelineStorageKey.Collapsed)
    return saved === TimelineStorageValue.True
  })

  // Persist collapsed state to localStorage
  useEffect(() => {
    browserStorage.setString(TimelineStorageKey.Collapsed, String(isCollapsed))
  }, [isCollapsed])

  // Sort beats by sequence
  const sortedBeats = useMemo(
    () => [...beats].sort((a, b) => a.sequence - b.sequence),
    [beats]
  )

  const indexFromSelection = useMemo(() => {
    if (!selectedBeatId) return null
    const index = sortedBeats.findIndex(b => b.id === selectedBeatId)
    return index >= 0 ? index : null
  }, [selectedBeatId, sortedBeats])

  const resolvedIndex = indexFromSelection ?? currentIndex

  // Fetch character snapshots for selected beat
  useEffect(() => {
    if (!selectedBeatId || !episodeId) {
      queueMicrotask(() => setSnapshots([]))
      return
    }

    fetchStorytellerTimeline(episodeId, selectedBeatId)
      .then(data => {
        const snapshots: CharacterSnapshot[] = recordArrayFromJson(data.snapshots).map(row => ({
          characterId: readString(row.characterId) ?? '',
          characterName: readString(row.characterName) ?? '',
          stressLevel: readNumber(row.stressLevel) ?? 0,
          emotionalState: readString(row.emotionalState) ?? '',
          transformationProgress: readNumber(row.transformationProgress) ?? 0,
        }))
        if (snapshots.length > 0) {
          setSnapshots(snapshots)
        }
      })
      .catch(err => console.error(TIMELINE_FETCH_SNAPSHOTS_FAILED_LOG, err))
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
    if (resolvedIndex > 0) {
      const newIndex = resolvedIndex - 1
      setCurrentIndex(newIndex)
      onBeatSelect(sortedBeats[newIndex].id)
    }
  }

  const handleNext = () => {
    if (resolvedIndex < sortedBeats.length - 1) {
      const newIndex = resolvedIndex + 1
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
      <div className="h-10 border-t border-border bg-card/80 backdrop-blur flex items-center justify-center text-muted-foreground text-sm">
        <Button variant={ButtonVariantKey.Ghost} size={ButtonSizeKey.Sm} className="h-8 px-3 text-xs gap-1" disabled>
          Select an episode to view timeline
        </Button>
      </div>
    )
  }

  const currentBeat = sortedBeats[resolvedIndex]

  return (
    <div
      className={`border-t border-border bg-card/95 backdrop-blur flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? 'h-10' : 'h-40'
      }`}
    >
      {/* Collapse Toggle Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant={ButtonVariantKey.Ghost}
            size={ButtonSizeKey.Sm}
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-7 w-7 p-0"
            title={isCollapsed ? 'Expand timeline' : 'Collapse timeline'}
          >
            {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>

          {!isCollapsed && (
            <>
              <Button
                variant={ButtonVariantKey.Ghost}
                size={ButtonSizeKey.Sm}
                onClick={handlePrevious}
                disabled={resolvedIndex === 0}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant={ButtonVariantKey.Ghost}
                size={ButtonSizeKey.Sm}
                onClick={() => setIsPlaying(!isPlaying)}
                className="h-7 w-7 p-0"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </Button>
              <Button
                variant={ButtonVariantKey.Ghost}
                size={ButtonSizeKey.Sm}
                onClick={handleNext}
                disabled={resolvedIndex >= sortedBeats.length - 1}
                className="h-7 w-7 p-0"
              >
                <ChevronRight size={16} />
              </Button>
            </>
          )}

          <span className="text-xs text-muted-foreground ml-2">
            {sortedBeats.length > 0
              ? `Beat ${resolvedIndex + 1} of ${sortedBeats.length}`
              : 'No beats'}
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

      {/* Timeline Track - with overflow visible for tooltips */}
      <div
        className={`flex-1 flex transition-all duration-300 ease-in-out ${
          isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'
        }`}
      >
        {/* Beat Track */}
        <div className="flex-1 px-4 py-2 overflow-x-auto overflow-y-visible">
          <div className="relative h-8 bg-muted/30 rounded-full flex items-center px-2">
            {/* Progress line */}
            <div
              className="absolute left-2 h-1 bg-primary/50 rounded-full transition-all duration-300"
              style={{
                width:
                  sortedBeats.length > 1
                    ? `${(resolvedIndex / (sortedBeats.length - 1)) * 100}%`
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
                  className={`relative w-4 h-4 rounded-full transition-all duration-200 ${
                    index === resolvedIndex
                      ? 'scale-150 ring-2 ring-primary ring-offset-2 ring-offset-card'
                      : 'hover:scale-125'
                  } ${BEAT_COLORS[beat.beatType] || BEAT_COLORS.default}`}
                  title={beat.logline}
                >
                  {hoveredBeat === beat.id && (
                    <div
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-popover border border-border rounded-lg text-xs whitespace-nowrap shadow-xl pointer-events-none"
                      style={{ zIndex: 9999 }}
                    >
                      <div className="font-medium text-foreground mb-1">
                        {beat.beatType.toUpperCase()}
                      </div>
                      <div className="text-muted-foreground max-w-[200px] truncate">
                        {beat.logline}
                      </div>
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-border" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default Timeline
