export {
  BEAT_STATUS_BADGE_CLASS,
  BEAT_STATUS_DEFAULT_BADGE,
  BEAT_TYPE_BORDER_CLASS,
  BeatCardActionLabel,
  BeatCardCopy,
  BeatCardShellClass,
  BeatCardStatus,
  BeatCardType,
  BeatGenerationMode,
} from '../constants/beat-card'
import { BeatCardStatus, BeatCardType } from '../constants/beat-card'

const BEAT_TYPE_VALUES = new Set<string>(Object.values(BeatCardType))
const BEAT_STATUS_VALUES = new Set<string>(Object.values(BeatCardStatus))

export function isBeatCardType(value: string): value is BeatCardType {
  return BEAT_TYPE_VALUES.has(value)
}

export function isBeatCardStatus(value: string): value is BeatCardStatus {
  return BEAT_STATUS_VALUES.has(value)
}
