import { cn } from '@/shared/data/utils'
import { CharacterNodeBaseClass } from './constants/character-node-styles'

interface CharacterNodeStyleInput {
  selected: boolean
  isSelected: boolean | undefined
  isHighlighted: boolean | undefined
  isCentral: boolean | undefined
  styleBg: string
  styleBorder: string
}

export const getCharacterNodeClasses = ({
  selected,
  isSelected,
  isHighlighted,
  isCentral,
  styleBg,
  styleBorder,
}: CharacterNodeStyleInput): string =>
  cn(
    CharacterNodeBaseClass.Container,
    CharacterNodeBaseClass.Size,
    styleBg,
    styleBorder,
    selected && 'ring-2 ring-white/50',
    isSelected && 'ring-2 ring-cyan-400 shadow-xl shadow-cyan-500/40 scale-110',
    isHighlighted && !isSelected && 'ring-2 ring-amber-400/70 shadow-lg shadow-amber-500/20 scale-105',
    isCentral && !isSelected && !isHighlighted && 'ring-1 ring-emerald-400/50'
  )
