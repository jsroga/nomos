'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import type { ScriptEditorProps } from '../ScriptEditor'
import type { TimelineProps } from '../Timeline'
import type { StoryPlanBoardProps } from '../StoryPlanBoard'
import type { WorldBiblePanelProps } from '../WorldBiblePanel'
import type { CharacterWebProps } from '../CharacterWeb/CharacterWeb'

const loadingSpinner = (
  <div className="flex-1 flex items-center justify-center">
    <Loader2 className="animate-spin" />
  </div>
)

export const ScriptEditor = dynamic<ScriptEditorProps>(
  () => import('../ScriptEditor').then(m => m.default),
  { ssr: false, loading: () => loadingSpinner }
)

export const Timeline = dynamic<TimelineProps>(
  () => import('../Timeline').then(m => m.default),
  { ssr: false }
)

export const StoryPlanBoard = dynamic<StoryPlanBoardProps>(
  () => import('../StoryPlanBoard').then(m => m.default),
  { ssr: false, loading: () => loadingSpinner }
)

export const WorldBiblePanel = dynamic<WorldBiblePanelProps>(
  () => import('../WorldBiblePanel').then(m => m.default),
  { ssr: false, loading: () => loadingSpinner }
)

export const CharacterWeb = dynamic<CharacterWebProps>(
  () => import('../CharacterWeb').then(m => m.CharacterWeb),
  { ssr: false, loading: () => loadingSpinner }
)

export const ActionCommitted = dynamic(
  () => import('../ActionToast/ActionCommitted').then(m => m.ActionCommitted),
  { ssr: false }
)

export const ActionSuggestion = dynamic(
  () => import('../ActionToast/ActionSuggestion').then(m => m.ActionSuggestion),
  { ssr: false }
)

export const QuestionCard = dynamic(
  () => import('../QuestionCard').then(m => m.QuestionCard),
  { ssr: false }
)

export const EpisodeManager = dynamic(
  () => import('../EpisodeManager').then(m => m.EpisodeManager),
  { ssr: false }
)

export const MasterPromptEditor = dynamic(
  () => import('../MasterPromptEditor').then(m => m.MasterPromptEditor),
  { ssr: false }
)
