import type { BeatPlan } from '@/domains/storyteller/ai/agents/BeatPlanner/beat-plan-schema'
import type { RankedIdea } from '@/domains/storyteller/ai/agents/Muse/ranked-idea-schema'
import type { BeatDraftCanon } from '@/domains/storyteller/core/types/beat-draft-canon'
import type { Finding } from '@/domains/storyteller/core/types/finding'

export interface BeatDraftContext {
  projectId: string
  episodeId: string
  brief: string
  characters: string[]
}

export interface PersistedBeat {
  saved: boolean
  beatId?: string
  message: string
}

export interface BeatDraftDeps {
  assembleCanon: (ctx: BeatDraftContext) => Promise<BeatDraftCanon>
  planBeat: (
    ctx: BeatDraftContext,
    canon: string,
    retryFeedback?: string,
    sparksBlock?: string
  ) => Promise<BeatPlan>
  generateSparks: (ctx: BeatDraftContext, canon: string) => Promise<RankedIdea[]>
  draftBeat: (
    ctx: BeatDraftContext,
    canon: string,
    plan: BeatPlan,
    lintFeedback?: string
  ) => Promise<string>
  runProseCheck: (input: {
    draft: string
    plan: BeatPlan
    ctx: BeatDraftContext
    canon: BeatDraftCanon
  }) => Promise<Finding[]>
  critiqueContinuity: (draft: string, canon: string) => Promise<string>
  critiqueProse: (draft: string, canon: string) => Promise<string>
  critiqueStakes: (draft: string, canon: string) => Promise<string>
  reviseBeat: (
    ctx: BeatDraftContext,
    canon: string,
    draft: string,
    critiques: string,
    editorNote?: string
  ) => Promise<string>
  persistBeat: (ctx: BeatDraftContext, plan: BeatPlan, finalDraft: string) => Promise<PersistedBeat>
}
