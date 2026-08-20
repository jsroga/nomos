'use client'

import { Check, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/Tooltip'
import { KeyboardKey } from '@/shared/data/constants/protocol'
import { cn } from '@/shared/data/utils'
import {
  EPISODE_MANAGER_DELETE_TOOLTIP,
  EPISODE_MANAGER_UNTITLED,
  EpisodeManagerRowClass,
  episodePhaseChipLabel,
  formatEpisodeIndex,
} from './constants/episode-manager'
import {
  EpisodeTitleActionMode,
  episodeTitleActionLabel,
  episodeTitleActionMode,
} from './episode-title-action'
import type { PhaseId } from '@/domains/storyteller/core/types/enums'

interface EpisodeManagerRowEpisode {
  id: string
  title: string
  sequence: number
}

interface EpisodeManagerRowProps {
  episode: EpisodeManagerRowEpisode
  displayIndex: number
  isSelected: boolean
  editingId: string | null
  draftTitle: string
  currentPhase: PhaseId
  onSelect: (id: string) => void
  onDraftTitleChange: (title: string) => void
  onRename: (id: string, title: string) => void
  onStartRename: (id: string, title: string) => void
  onDelete: (id: string, title: string) => void
}

export function EpisodeManagerRow({
  episode,
  displayIndex,
  isSelected,
  editingId,
  draftTitle,
  currentPhase,
  onSelect,
  onDraftTitleChange,
  onRename,
  onStartRename,
  onDelete,
}: EpisodeManagerRowProps) {
  const actionMode = episodeTitleActionMode(editingId, episode.id)

  return (
    <div
      className={cn(
        EpisodeManagerRowClass.Row,
        isSelected ? EpisodeManagerRowClass.RowSelected : EpisodeManagerRowClass.RowIdle
      )}
      onClick={() => onSelect(episode.id)}
    >
      <span
        className={cn(
          EpisodeManagerRowClass.Index,
          isSelected ? EpisodeManagerRowClass.IndexSelected : EpisodeManagerRowClass.IndexIdle
        )}
      >
        {formatEpisodeIndex(displayIndex)}
      </span>
      {editingId === episode.id ? (
        <input
          autoFocus
          className={EpisodeManagerRowClass.TitleInput}
          value={draftTitle}
          onChange={e => onDraftTitleChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === KeyboardKey.Enter) void onRename(episode.id, draftTitle)
          }}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <div className={EpisodeManagerRowClass.TitleCluster}>
          <span
            className={cn(
              EpisodeManagerRowClass.Title,
              isSelected && EpisodeManagerRowClass.TitleSelected
            )}
            onDoubleClick={e => {
              e.stopPropagation()
              onStartRename(episode.id, episode.title)
            }}
          >
            {episode.title || EPISODE_MANAGER_UNTITLED}
          </span>
          {isSelected ? (
            <span className={EpisodeManagerRowClass.Chip}>{episodePhaseChipLabel(currentPhase)}</span>
          ) : null}
        </div>
      )}
      <div
        className={cn(
          EpisodeManagerRowClass.Actions,
          editingId === episode.id
            ? EpisodeManagerRowClass.ActionsEditing
            : EpisodeManagerRowClass.ActionsIdle
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0"
              onClick={e => {
                e.stopPropagation()
                if (editingId === episode.id) {
                  void onRename(episode.id, draftTitle)
                  return
                }
                onStartRename(episode.id, episode.title)
              }}
            >
              {actionMode === EpisodeTitleActionMode.Save ? <Check size={12} /> : <Edit2 size={12} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{episodeTitleActionLabel(actionMode)}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              onClick={e => {
                e.stopPropagation()
                onDelete(episode.id, episode.title)
              }}
            >
              <Trash2 size={12} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{EPISODE_MANAGER_DELETE_TOOLTIP}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
