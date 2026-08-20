/** Copy for Writers Room toasts and confirm dialogs. */

export enum WritersRoomToast {
  AlreadyInWorld = 'Already in the world bible',
  AlreadyQueued = 'Already queued for review',
  AddedToWorld = 'Added to world',
  CharacterForm = 'Applied to the character form',
  EpisodeCreated = 'Episode created',
  PendingExtrasPrefix = 'Also pending: ',
  NoBibleUpdates = 'No world bible updates in this message',
  NoCharacterForm = 'No character fields to apply',
  BeatOnBoard = 'Beat is on the board',
  CastAdded = 'Added new characters to cast',
  SectionAddedPrefix = 'Added to world: ',
}

export enum WritersRoomConfirm {
  ExtraTitle = 'Extra bible updates',
  ExtraConfirm = 'Include extras',
  ExtraCancel = 'Only requested section',
  AddToWorldTitle = 'Add to world',
  AddToWorldConfirm = 'Update all',
  AddToWorldCancel = 'Cancel',
  AddToWorldPrefix = 'These sections will be updated: ',
}

export enum WritersRoomCastConfirm {
  Title = 'Add new characters to cast',
  Confirm = 'Add to cast',
  Cancel = 'Skip',
  Prefix = 'These characters will be added to the cast: ',
}

export enum WritersRoomAddToWorldLabel {
  CharacterForm = 'Character form',
}

export enum WritersRoomListJoin {
  CommaSpace = ', ',
}

export function writersRoomExtraDescription(
  requestedSection: string,
  extraKeys: string[],
): string {
  return `Requested section: ${requestedSection}. The agent also returned: ${extraKeys.join(WritersRoomListJoin.CommaSpace)}. Include those extras in pending review, or keep only the requested section?`
}

export function newCastDescription(names: readonly string[]): string {
  return `${WritersRoomCastConfirm.Prefix}${names.join(WritersRoomListJoin.CommaSpace)}`
}
