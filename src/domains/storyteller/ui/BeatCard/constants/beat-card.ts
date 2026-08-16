/** Beat card UI wire constants. */

export enum BeatGenerationMode {
  Image = 'image',
}

export enum BeatCardCopy {
  Generating = 'Generating…',
}

export enum BeatCardActionLabel {
  GenerateImage = 'Generate storyboard image',
  Edit = 'Edit beat',
  Delete = 'Delete beat',
}

export enum BeatCardType {
  Default = 'default',
  Setup = 'setup',
  Complication = 'complication',
  Revelation = 'revelation',
  Confrontation = 'confrontation',
  Transition = 'transition',
  Decision = 'decision',
  Consequence = 'consequence',
  Climax = 'climax',
  Resolution = 'resolution',
}

export enum BeatCardStatus {
  Approved = 'approved',
  Proposed = 'proposed',
  Locked = 'locked',
}

export const BEAT_TYPE_BORDER_CLASS: Record<BeatCardType, string> = {
  [BeatCardType.Default]: 'border-l-border bg-card',
  [BeatCardType.Setup]: 'border-l-blue-500 bg-card',
  [BeatCardType.Complication]: 'border-l-red-500 bg-card',
  [BeatCardType.Revelation]: 'border-l-amber-500 bg-card',
  [BeatCardType.Confrontation]: 'border-l-red-400 bg-card',
  [BeatCardType.Transition]: 'border-l-sky-500 bg-card',
  [BeatCardType.Decision]: 'border-l-purple-500 bg-card',
  [BeatCardType.Consequence]: 'border-l-orange-500 bg-card',
  [BeatCardType.Climax]: 'border-l-fuchsia-500 bg-card',
  [BeatCardType.Resolution]: 'border-l-emerald-500 bg-card',
}

export const BEAT_STATUS_BADGE_CLASS: Record<BeatCardStatus, string> = {
  [BeatCardStatus.Approved]:
    'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  [BeatCardStatus.Proposed]:
    'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  [BeatCardStatus.Locked]: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
}

export const BEAT_STATUS_DEFAULT_BADGE =
  'bg-muted text-muted-foreground border border-border'

const BEAT_TYPE_VALUES = new Set<string>(Object.values(BeatCardType))
const BEAT_STATUS_VALUES = new Set<string>(Object.values(BeatCardStatus))

export function isBeatCardType(value: string): value is BeatCardType {
  return BEAT_TYPE_VALUES.has(value)
}

export function isBeatCardStatus(value: string): value is BeatCardStatus {
  return BEAT_STATUS_VALUES.has(value)
}
