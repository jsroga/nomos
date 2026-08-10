/** Copy for Writers Room toasts and confirm dialogs. */

export enum WritersRoomToast {
  AlreadyInWorld = 'Already in the world bible',
  AlreadyQueued = 'Already queued for review',
  AddedToWorld = 'Added to world',
  EpisodeCreated = 'Episode created',
}

export enum WritersRoomConfirm {
  ExtraTitle = 'Extra bible updates',
  ExtraConfirm = 'Include extras',
  ExtraCancel = 'Only requested section',
}

export function writersRoomExtraDescription(
  requestedSection: string,
  extraKeys: string[],
): string {
  return `Requested section: ${requestedSection}. The agent also returned: ${extraKeys.join(', ')}. Include those extras in pending review, or keep only the requested section?`
}
