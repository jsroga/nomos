'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import type {
  CharacterWebProps,
  ScriptEditorProps,
  StoryPlanBoardProps,
  TimelineProps,
  WorldBiblePanelProps,
} from '@/domains/storyteller'

const loadingSpinner = (
  <div className="flex-1 flex items-center justify-center">
    <Loader2 className="animate-spin" />
  </div>
)

export const ScriptEditor = dynamic<ScriptEditorProps>(
  () => import('@/domains/storyteller').then(m => m.ScriptEditor),
  { ssr: false, loading: () => loadingSpinner }
)

export const Timeline = dynamic<TimelineProps>(
  () => import('@/domains/storyteller').then(m => m.Timeline),
  { ssr: false }
)

export const StoryPlanBoard = dynamic<StoryPlanBoardProps>(
  () => import('@/domains/storyteller').then(m => m.StoryPlanBoard),
  { ssr: false, loading: () => loadingSpinner }
)

export const WorldBiblePanel = dynamic<WorldBiblePanelProps>(
  () => import('@/domains/storyteller').then(m => m.WorldBiblePanel),
  { ssr: false, loading: () => loadingSpinner }
)

export const CharacterWeb = dynamic<CharacterWebProps>(
  () => import('@/domains/storyteller').then(m => m.CharacterWeb),
  { ssr: false, loading: () => loadingSpinner }
)

export const ActionApprovalModal = dynamic(
  () => import('@/domains/storyteller').then(m => m.ActionApprovalModal),
  { ssr: false }
)

export const ActionCommitted = dynamic(
  () => import('@/domains/storyteller').then(m => m.ActionCommitted),
  { ssr: false }
)

export const ActionSuggestion = dynamic(
  () => import('@/domains/storyteller').then(m => m.ActionSuggestion),
  { ssr: false }
)

export const QuestionCard = dynamic(
  () => import('@/domains/storyteller').then(m => m.QuestionCard),
  { ssr: false }
)

export const EpisodeManager = dynamic(
  () => import('@/domains/storyteller').then(m => m.EpisodeManager),
  { ssr: false }
)

export const MasterPromptEditor = dynamic(
  () => import('@/domains/storyteller').then(m => m.MasterPromptEditor),
  { ssr: false }
)
