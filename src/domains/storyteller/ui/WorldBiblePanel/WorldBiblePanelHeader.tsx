'use client'

import { useLayoutEffect, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Edit2, BookOpen } from 'lucide-react'
import { DomKeyboardEvent } from '@/components/DomainSidebar/constants/domain-sidebar'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { cn } from '@/shared/data/utils'
import { StorytellerBibleTab } from './constants/world-bible-panel'
import { toggledBibleTab } from './utils/toggled-bible-tab'
import {
  StorytellerHeaderClass,
  StorytellerHeaderCopy,
  StorytellerHeaderKey,
  StorytellerHeaderSlotId,
} from '@/domains/storyteller/ui/StorytellerLayout/constants/storyteller-module-header'

function RelationshipsGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="5" cy="19" r="2.5" />
      <circle cx="19" cy="19" r="2.5" />
      <path d="M10.5 7 6.5 16.5M13.5 7l4 9.5" />
    </svg>
  )
}

export interface WorldBiblePanelHeaderProps {
  activeTab: StorytellerBibleTab
  onSwitchTab: (tab: StorytellerBibleTab) => void
  effectiveReadOnly: boolean
  isEditing: boolean
  onStartEditing: () => void
  onCancelEdit: () => void
  onSavePlan: () => void
  hasOnUpdate: boolean
}

export function WorldBiblePanelHeader(props: WorldBiblePanelHeaderProps) {
  const [host, setHost] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    setHost(document.getElementById(StorytellerHeaderSlotId.BibleChrome))
  }, [])

  useEffect(() => {
    if (!props.isEditing) return
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === StorytellerHeaderKey.Save) {
        event.preventDefault()
        props.onSavePlan()
      }
      if (event.key === StorytellerHeaderKey.Escape) {
        event.preventDefault()
        props.onCancelEdit()
      }
    }
    document.addEventListener(DomKeyboardEvent.KeyDown, onKey)
    return () => document.removeEventListener(DomKeyboardEvent.KeyDown, onKey)
  }, [props.isEditing, props.onSavePlan, props.onCancelEdit])

  const chrome = <WorldBiblePanelHeaderChrome {...props} />
  if (host) return createPortal(chrome, host)
  return <div className="flex h-[50px] items-center gap-3.5 px-5 border-b border-border/70">{chrome}</div>
}

function WorldBiblePanelHeaderChrome({
  activeTab,
  onSwitchTab,
  effectiveReadOnly,
  isEditing,
  onStartEditing,
  onCancelEdit,
  onSavePlan,
  hasOnUpdate,
}: WorldBiblePanelHeaderProps) {
  if (isEditing) {
    return (
      <>
        <div className={StorytellerHeaderClass.EditingStatus}>
          <Edit2 size={13} strokeWidth={1.8} className="text-primary" />
          <span>{StorytellerHeaderCopy.EditingBible}</span>
        </div>
        <div className="flex-1" />
        <button type={HtmlElementType.Button} className={StorytellerHeaderClass.Discard} onClick={onCancelEdit}>
          {StorytellerHeaderCopy.Discard}
        </button>
        <button type={HtmlElementType.Button} className={StorytellerHeaderClass.Done} onClick={onSavePlan}>
          {StorytellerHeaderCopy.Done}
          <span className="font-mono text-[10px] opacity-65">{StorytellerHeaderCopy.SaveShortcut}</span>
        </button>
      </>
    )
  }

  return (
    <>
      <div className="flex gap-0.5" role="tablist">
        <button
          type={HtmlElementType.Button}
          role="tab"
          aria-selected={activeTab === StorytellerBibleTab.Content}
          onClick={() => onSwitchTab(StorytellerBibleTab.Content)}
          className={cn(
            StorytellerHeaderClass.Tab,
            activeTab === StorytellerBibleTab.Content
              ? StorytellerHeaderClass.TabActive
              : StorytellerHeaderClass.TabIdle
          )}
        >
          <BookOpen size={13} strokeWidth={1.7} />
          {StorytellerHeaderCopy.Content}
        </button>
        <button
          type={HtmlElementType.Button}
          role="tab"
          aria-selected={activeTab === StorytellerBibleTab.Relationships}
          onClick={() => onSwitchTab(toggledBibleTab(activeTab))}
          className={cn(
            StorytellerHeaderClass.Tab,
            activeTab === StorytellerBibleTab.Relationships
              ? StorytellerHeaderClass.TabActive
              : StorytellerHeaderClass.TabIdle
          )}
        >
          <RelationshipsGlyph />
          {StorytellerHeaderCopy.Relationships}
        </button>
      </div>
      <div className="flex-1" />
      {effectiveReadOnly || !hasOnUpdate ? null : (
        <button type={HtmlElementType.Button} className={StorytellerHeaderClass.Edit} onClick={onStartEditing}>
          <Edit2 size={13} strokeWidth={1.7} />
          {StorytellerHeaderCopy.Edit}
        </button>
      )}
    </>
  )
}
