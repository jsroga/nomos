import { resumeChatWorkflow, DEFAULT_RESUME_URL } from '@/shared/chat'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { ActionType, BibleSection } from '@/domains/storyteller/core/types/enums'
import { ArtifactKind } from '@/domains/storyteller/core/types/artifact-kind'
import type { StorytellerPromptRegistryId } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-ids'
import { startStorytellerArtifactDraft } from '@/domains/storyteller/core/io/artifact-draft.api'
import { StorytellerWorkflowVerdict } from '@/domains/storyteller/core/storyteller-page-wire'
import { recordFromJson } from '@/shared/data/json-guards'
import type { PendingAction } from '@/domains/storyteller/ui/WorldBible/utils/bible-context-types'

export interface SettleArtifactDraftResult {
  ok: boolean
  persisted: boolean
  errorText?: string
}

export async function settleArtifactDraftVerdict(
  runId: string,
  verdict: StorytellerWorkflowVerdict
): Promise<SettleArtifactDraftResult> {
  const resumed = await resumeChatWorkflow(DEFAULT_RESUME_URL, {
    runId,
    selectedOption: verdict,
  })
  if (!resumed.ok) {
    return { ok: false, persisted: false, errorText: resumed.errorText }
  }
  const output = recordFromJson(recordFromJson(resumed.result).output)
  return { ok: true, persisted: output.persisted === true }
}

export function artifactDraftOverlayHandlers(
  runId: string,
  onSettled: () => void
): Pick<PendingAction, 'onAccept' | 'onReject'> {
  const settle = async (verdict: StorytellerWorkflowVerdict) => {
    await settleArtifactDraftVerdict(runId, verdict)
    onSettled()
  }
  return {
    onAccept: () => settle(StorytellerWorkflowVerdict.Approve),
    onReject: () => settle(StorytellerWorkflowVerdict.Kill),
  }
}

function actionTypeForArtifactDraft(input: {
  section: string
  kind?: ArtifactKind
  characterId?: string
}): ActionType {
  if (input.kind === ArtifactKind.Character) {
    if (input.characterId) return ActionType.UPDATE_CHARACTER
    return ActionType.CREATE_CHARACTER
  }
  if (input.section === BibleSection.EPISODE_PREMISE) return ActionType.UPDATE_EPISODE_PREMISE
  return ActionType.UPDATE_SERIES_BIBLE
}

export function pendingActionForArtifactDraft(input: {
  section: string
  runId: string
  draft: string
  onSettled: () => void
  episodeId?: string
  kind?: ArtifactKind
  characterId?: string
}): PendingAction {
  const handlers = artifactDraftOverlayHandlers(input.runId, input.onSettled)
  const actionType = actionTypeForArtifactDraft(input)
  return {
    section: input.section,
    preview: input.draft,
    action: {
      type: actionType,
      payload: { draft: input.draft, runId: input.runId, episodeId: input.episodeId },
      status: ApprovalActionStatus.PENDING,
      id: input.runId,
    },
    onAccept: handlers.onAccept,
    onReject: handlers.onReject,
    episodeId: input.episodeId,
  }
}

function processingPending(section: string): PendingAction {
  return {
    section,
    preview: '',
    action: {
      type: ActionType.UPDATE_SERIES_BIBLE,
      payload: {},
      status: ApprovalActionStatus.PENDING,
      id: section,
    },
    onAccept: () => undefined,
    onReject: () => undefined,
    isProcessing: true,
  }
}

export async function runArtifactDraftOverlay(input: {
  projectId: string
  kind: ArtifactKind
  promptId: StorytellerPromptRegistryId
  overlaySection: string
  setPendingAction: (section: string, action: PendingAction | null) => void
  section?: BibleSection
  episodeId?: string
  characterId?: string
}): Promise<void> {
  input.setPendingAction(input.overlaySection, processingPending(input.overlaySection))
  try {
    const started = await startStorytellerArtifactDraft({
      projectId: input.projectId,
      kind: input.kind,
      section: input.section,
      promptId: input.promptId,
      episodeId: input.episodeId,
      characterId: input.characterId,
    })
    if (!started.runId) {
      input.setPendingAction(input.overlaySection, null)
      return
    }
    input.setPendingAction(
      input.overlaySection,
      pendingActionForArtifactDraft({
        section: input.overlaySection,
        runId: started.runId,
        draft: started.draft,
        episodeId: input.episodeId,
        kind: input.kind,
        characterId: input.characterId,
        onSettled: () => input.setPendingAction(input.overlaySection, null),
      })
    )
  } catch {
    input.setPendingAction(input.overlaySection, null)
  }
}

export async function runBibleSectionArtifactDraft(input: {
  projectId: string
  section: BibleSection
  promptId: StorytellerPromptRegistryId
  setPendingAction: (section: string, action: PendingAction | null) => void
}): Promise<void> {
  await runArtifactDraftOverlay({
    projectId: input.projectId,
    kind: ArtifactKind.BibleSection,
    section: input.section,
    promptId: input.promptId,
    overlaySection: input.section,
    setPendingAction: input.setPendingAction,
  })
}
