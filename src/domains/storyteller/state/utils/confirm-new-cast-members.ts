import type { StreamAgentAction } from '@/domains/storyteller/core/types/action-types'
import {
  collectCastCandidates,
  existingCastEntries,
  existingCastNames,
  newCastMembers,
  updateCastAction,
  type CollectCastCandidatesInput,
} from '@/domains/storyteller/state/utils/new-cast-characters'
import {
  newCastDescription,
  WritersRoomCastConfirm,
  WritersRoomToast,
} from '@/domains/storyteller/ui/StorytellerLayout/constants/writers-room-copy'
import { toast } from 'sonner'

export type ConfirmNewCastInput = CollectCastCandidatesInput

export enum ConfirmNewCastOutcome {
  Skipped = 'skipped',
  Cancelled = 'cancelled',
  Added = 'added',
}

export interface ConfirmNewCastDialogOptions {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
}

export async function confirmNewCastMembers(input: {
  payload: ConfirmNewCastInput
  characters: readonly { name: string; role?: string; description?: string }[]
  storyPlan: unknown
  executeAction: (action: StreamAgentAction) => Promise<unknown> | unknown
  confirm: (options: ConfirmNewCastDialogOptions) => Promise<boolean>
}): Promise<ConfirmNewCastOutcome> {
  const additions = newCastMembers(
    collectCastCandidates(input.payload),
    existingCastNames(input.characters, input.storyPlan),
  )
  if (additions.length === 0) return ConfirmNewCastOutcome.Skipped

  const confirmed = await input.confirm({
    title: WritersRoomCastConfirm.Title,
    description: newCastDescription(additions.map(member => member.name)),
    confirmLabel: WritersRoomCastConfirm.Confirm,
    cancelLabel: WritersRoomCastConfirm.Cancel,
  })
  if (!confirmed) return ConfirmNewCastOutcome.Cancelled

  await input.executeAction(
    updateCastAction({
      existingCast: existingCastEntries(input.characters, input.storyPlan),
      additions,
    }),
  )
  toast.success(WritersRoomToast.CastAdded)
  return ConfirmNewCastOutcome.Added
}
