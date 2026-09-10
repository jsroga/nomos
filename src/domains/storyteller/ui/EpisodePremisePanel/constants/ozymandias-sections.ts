import { Anchor, LucideIcon, Skull, TrendingUp, Zap } from 'lucide-react'

export enum EpisodePremiseSectionKey {
  ProtagonistHook = 'protagonistHook',
  FatalFlaw = 'fatalFlaw',
  Stakes = 'stakes',
  InevitableConsequence = 'inevitableConsequence',
  Logline = 'logline',
  TenPointsPlan = 'tenPointsPlan',
}

export enum OzymandiasSectionTone {
  Primary = 'primary',
  Red = 'red',
  Orange = 'orange',
  Purple = 'purple',
}

export type OzymandiasFieldKey =
  | EpisodePremiseSectionKey.ProtagonistHook
  | EpisodePremiseSectionKey.FatalFlaw
  | EpisodePremiseSectionKey.Stakes
  | EpisodePremiseSectionKey.InevitableConsequence

export interface OzymandiasSectionConfig {
  key: OzymandiasFieldKey
  label: string
  icon: LucideIcon
  tone: OzymandiasSectionTone
  placeholder: string
  emptyActionLabel: string
}

export const OZYMANSIAS_SECTIONS: OzymandiasSectionConfig[] = [
  {
    key: EpisodePremiseSectionKey.ProtagonistHook,
    label: 'Protagonist Hook',
    icon: Anchor,
    tone: OzymandiasSectionTone.Primary,
    placeholder: 'The opening situation...',
    emptyActionLabel: 'Generate episode premise',
  },
  {
    key: EpisodePremiseSectionKey.FatalFlaw,
    label: 'Fatal Flaw',
    icon: Skull,
    tone: OzymandiasSectionTone.Red,
    placeholder: 'The internal flaw driving the conflict...',
    emptyActionLabel: 'Generate fatal flaw',
  },
  {
    key: EpisodePremiseSectionKey.Stakes,
    label: 'Stakes',
    icon: TrendingUp,
    tone: OzymandiasSectionTone.Orange,
    placeholder: 'What is strictly at risk...',
    emptyActionLabel: 'Generate stakes',
  },
  {
    key: EpisodePremiseSectionKey.InevitableConsequence,
    label: 'Inevitable Consequence',
    icon: Zap,
    tone: OzymandiasSectionTone.Purple,
    placeholder: 'The irreversible change...',
    emptyActionLabel: 'Generate consequence',
  },
]

const TONE_LABEL_CLASS: Record<OzymandiasSectionTone, string> = {
  [OzymandiasSectionTone.Primary]: 'text-primary',
  [OzymandiasSectionTone.Red]: 'text-red-400',
  [OzymandiasSectionTone.Orange]: 'text-orange-400',
  [OzymandiasSectionTone.Purple]: 'text-purple-400',
}

const TONE_BORDER_CLASS: Record<OzymandiasSectionTone, string> = {
  [OzymandiasSectionTone.Primary]: 'border-border',
  [OzymandiasSectionTone.Red]: 'border-border',
  [OzymandiasSectionTone.Orange]: 'border-border',
  [OzymandiasSectionTone.Purple]: 'border-border',
}

const TONE_BG_CLASS: Record<OzymandiasSectionTone, string> = {
  [OzymandiasSectionTone.Primary]: 'bg-muted/50 border-border focus:border-primary focus:ring-primary/30',
  [OzymandiasSectionTone.Red]: 'bg-red-500/5 border-border focus:border-red-500 focus:ring-red-500/30',
  [OzymandiasSectionTone.Orange]:
    'bg-orange-500/5 border-border focus:border-orange-500 focus:ring-orange-500/30',
  [OzymandiasSectionTone.Purple]:
    'bg-purple-500/5 border-border focus:border-purple-500 focus:ring-purple-500/30',
}

const TONE_DASHED_CLASS: Record<OzymandiasSectionTone, string> = {
  [OzymandiasSectionTone.Primary]: 'border-border hover:border-primary/50 hover:bg-muted/20',
  [OzymandiasSectionTone.Red]: 'border-border hover:border-primary/50 hover:bg-muted/20',
  [OzymandiasSectionTone.Orange]: 'border-border hover:border-primary/50 hover:bg-muted/20',
  [OzymandiasSectionTone.Purple]: 'border-border hover:border-primary/50 hover:bg-muted/20',
}

const TONE_SKELETON_CLASS: Record<OzymandiasSectionTone, string> = {
  [OzymandiasSectionTone.Primary]: '',
  [OzymandiasSectionTone.Red]: 'bg-red-500/10',
  [OzymandiasSectionTone.Orange]: 'bg-orange-500/10',
  [OzymandiasSectionTone.Purple]: 'bg-purple-500/10',
}

const TONE_EMPTY_ICON_CLASS: Record<OzymandiasSectionTone, string> = {
  [OzymandiasSectionTone.Primary]: 'text-muted-foreground',
  [OzymandiasSectionTone.Red]: 'text-red-400/50',
  [OzymandiasSectionTone.Orange]: 'text-orange-400/50',
  [OzymandiasSectionTone.Purple]: 'text-purple-400/50',
}

const TONE_HOVER_CLASS: Record<OzymandiasSectionTone, string> = {
  [OzymandiasSectionTone.Primary]: 'hover:text-primary',
  [OzymandiasSectionTone.Red]: 'hover:text-red-400',
  [OzymandiasSectionTone.Orange]: 'hover:text-orange-400',
  [OzymandiasSectionTone.Purple]: 'hover:text-purple-400',
}

export {
  TONE_BG_CLASS,
  TONE_BORDER_CLASS,
  TONE_DASHED_CLASS,
  TONE_EMPTY_ICON_CLASS,
  TONE_HOVER_CLASS,
  TONE_LABEL_CLASS,
  TONE_SKELETON_CLASS,
}

