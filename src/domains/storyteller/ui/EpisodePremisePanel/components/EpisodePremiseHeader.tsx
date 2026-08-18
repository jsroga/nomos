'use client'

import { useLayoutEffect, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Edit2 } from 'lucide-react'
import { DomKeyboardEvent } from '@/components/DomainSidebar/constants/domain-sidebar'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import {
  StorytellerHeaderClass,
  StorytellerHeaderCopy,
  StorytellerHeaderKey,
  StorytellerHeaderSlotId,
} from '@/domains/storyteller/ui/StorytellerLayout/constants/storyteller-module-header'

export interface EpisodePremiseHeaderProps {
  isEditing: boolean
  isGenerating: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: () => void
}

export function EpisodePremiseHeader(props: EpisodePremiseHeaderProps) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  const isWorldBibleOpen = useStorytellerUiStore(state => state.isWorldBibleOpen)
  const setEpisodeEditing = useStorytellerUiStore(state => state.setEpisodeEditing)

  useLayoutEffect(() => {
    setHost(document.getElementById(StorytellerHeaderSlotId.EpisodeChrome))
  }, [isWorldBibleOpen])

  useEffect(() => {
    setEpisodeEditing(props.isEditing)
    return () => setEpisodeEditing(false)
  }, [props.isEditing, setEpisodeEditing])

  useEffect(() => {
    if (!props.isEditing) return
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === StorytellerHeaderKey.Save) {
        event.preventDefault()
        props.onSave()
      }
      if (event.key === StorytellerHeaderKey.Escape) {
        event.preventDefault()
        props.onCancelEdit()
      }
    }
    document.addEventListener(DomKeyboardEvent.KeyDown, onKey)
    return () => document.removeEventListener(DomKeyboardEvent.KeyDown, onKey)
  }, [props.isEditing, props.onSave, props.onCancelEdit])

  const chrome = <EpisodePremiseHeaderChrome {...props} />
  if (host) return createPortal(chrome, host)
  return null
}

function EpisodePremiseHeaderChrome({
  isEditing,
  isGenerating,
  onStartEdit,
  onCancelEdit,
  onSave,
}: EpisodePremiseHeaderProps) {
  if (isEditing) {
    return (
      <>
        <div className={StorytellerHeaderClass.EditingStatus}>
          <Edit2 size={13} strokeWidth={1.8} className="text-primary" />
          <span>{StorytellerHeaderCopy.EditingEpisode}</span>
        </div>
        <div className="flex-1" />
        <button type={HtmlElementType.Button} className={StorytellerHeaderClass.Discard} onClick={onCancelEdit}>
          {StorytellerHeaderCopy.Discard}
        </button>
        <button type={HtmlElementType.Button} className={StorytellerHeaderClass.Done} onClick={onSave}>
          {StorytellerHeaderCopy.Done}
          <span className="font-mono text-[10px] opacity-65">{StorytellerHeaderCopy.SaveShortcut}</span>
        </button>
      </>
    )
  }

  return (
    <>
      <div className="flex-1" />
      <button
        type={HtmlElementType.Button}
        className={StorytellerHeaderClass.Edit}
        onClick={onStartEdit}
        disabled={isGenerating}
      >
        <Edit2 size={13} strokeWidth={1.7} />
        {StorytellerHeaderCopy.Edit}
      </button>
    </>
  )
}
