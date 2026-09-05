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
  async () => (await import('../ScriptEditor')).default,
  { ssr: false, loading: () => loadingSpinner }
)

export const Timeline = dynamic<TimelineProps>(
  async () => (await import('../Timeline')).default,
  { ssr: false }
)

export const StoryPlanBoard = dynamic<StoryPlanBoardProps>(
  async () => (await import('../StoryPlanBoard')).default,
  { ssr: false, loading: () => loadingSpinner }
)

export const WorldBiblePanel = dynamic<WorldBiblePanelProps>(
  async () => (await import('../WorldBiblePanel')).default,
  { ssr: false, loading: () => loadingSpinner }
)

export const CharacterWeb = dynamic<CharacterWebProps>(
  async () => (await import('../CharacterWeb')).CharacterWeb,
  { ssr: false, loading: () => loadingSpinner }
)

export const ActionCommitted = dynamic(
  async () => (await import('../ActionToast/ActionCommitted')).ActionCommitted,
  { ssr: false }
)

export const ActionSuggestion = dynamic(
  async () => (await import('../ActionToast/ActionSuggestion')).ActionSuggestion,
  { ssr: false }
)

export const QuestionCard = dynamic(
  async () => (await import('../QuestionCard')).QuestionCard,
  { ssr: false }
)

export const EpisodeManager = dynamic(
  async () => (await import('../EpisodeManager')).EpisodeManager,
  { ssr: false }
)
