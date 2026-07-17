import type { LucideIcon } from 'lucide-react'
import {
  Brain,
  Compass,
  Flame,
  Heart,
  Scale,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import {
  StorytellerConfirmCopy,
  StorytellerConfirmVariant,
} from '@/domains/storyteller/core/storyteller-page-wire'

export enum CharacterMetricKey {
  Valence = 'valence',
  Arousal = 'arousal',
  Autonomy = 'autonomy',
  Competence = 'competence',
  Relatedness = 'relatedness',
  CognitiveClarity = 'cognitiveClarity',
  PerceivedStakes = 'perceivedStakes',
  SocialSafety = 'socialSafety',
  MoralAlignment = 'moralAlignment',
  Transformation = 'transformation',
}

export enum CharacterMetricLabel {
  Mood = 'Mood',
  Energy = 'Energy',
  Freedom = 'Freedom',
  Confidence = 'Confidence',
  Connection = 'Connection',
  Clarity = 'Clarity',
  Tension = 'Tension',
  Security = 'Security',
  Integrity = 'Integrity',
  ArcProgress = 'Arc Progress',
}

export enum CharacterMetricLowLabel {
  Negative = 'Negative',
  Calm = 'Calm',
  Constrained = 'Constrained',
  Doubt = 'Doubt',
  Isolated = 'Isolated',
  Confused = 'Confused',
  Low = 'Low',
  Threatened = 'Threatened',
  Compromised = 'Compromised',
  Start = 'Start',
}

export enum CharacterMetricHighLabel {
  Positive = 'Positive',
  Activated = 'Activated',
  Free = 'Free',
  Capable = 'Capable',
  Connected = 'Connected',
  Sharp = 'Sharp',
  Critical = 'Critical',
  Safe = 'Safe',
  Aligned = 'Aligned',
  Complete = 'Complete',
}

export enum CharacterMetricColor {
  Pink = 'text-pink-400',
  Yellow = 'text-yellow-400',
  Blue = 'text-blue-400',
  Green = 'text-green-400',
  Cyan = 'text-cyan-400',
  Purple = 'text-purple-400',
  Orange = 'text-orange-400',
  Teal = 'text-teal-400',
  Indigo = 'text-indigo-400',
  Emerald = 'text-emerald-400',
}

export enum CharacterPanelConfirmCopy {
  DeleteTitle = 'Delete Character',
  DeleteLabel = 'Delete',
}

export const CHARACTER_PANEL_LOG_FETCH_FAILED = 'Failed to fetch character snapshots:'

export interface CharacterMetricConfig {
  key: CharacterMetricKey
  label: string
  icon: LucideIcon
  color: string
  lowLabel: string
  highLabel: string
  isValence?: boolean
}

export const CHARACTER_METRIC_CONFIG: CharacterMetricConfig[] = [
  {
    key: CharacterMetricKey.Valence,
    label: CharacterMetricLabel.Mood,
    icon: Heart,
    color: CharacterMetricColor.Pink,
    lowLabel: CharacterMetricLowLabel.Negative,
    highLabel: CharacterMetricHighLabel.Positive,
    isValence: true,
  },
  {
    key: CharacterMetricKey.Arousal,
    label: CharacterMetricLabel.Energy,
    icon: Zap,
    color: CharacterMetricColor.Yellow,
    lowLabel: CharacterMetricLowLabel.Calm,
    highLabel: CharacterMetricHighLabel.Activated,
  },
  {
    key: CharacterMetricKey.Autonomy,
    label: CharacterMetricLabel.Freedom,
    icon: Compass,
    color: CharacterMetricColor.Blue,
    lowLabel: CharacterMetricLowLabel.Constrained,
    highLabel: CharacterMetricHighLabel.Free,
  },
  {
    key: CharacterMetricKey.Competence,
    label: CharacterMetricLabel.Confidence,
    icon: Target,
    color: CharacterMetricColor.Green,
    lowLabel: CharacterMetricLowLabel.Doubt,
    highLabel: CharacterMetricHighLabel.Capable,
  },
  {
    key: CharacterMetricKey.Relatedness,
    label: CharacterMetricLabel.Connection,
    icon: Users,
    color: CharacterMetricColor.Cyan,
    lowLabel: CharacterMetricLowLabel.Isolated,
    highLabel: CharacterMetricHighLabel.Connected,
  },
  {
    key: CharacterMetricKey.CognitiveClarity,
    label: CharacterMetricLabel.Clarity,
    icon: Brain,
    color: CharacterMetricColor.Purple,
    lowLabel: CharacterMetricLowLabel.Confused,
    highLabel: CharacterMetricHighLabel.Sharp,
  },
  {
    key: CharacterMetricKey.PerceivedStakes,
    label: CharacterMetricLabel.Tension,
    icon: Flame,
    color: CharacterMetricColor.Orange,
    lowLabel: CharacterMetricLowLabel.Low,
    highLabel: CharacterMetricHighLabel.Critical,
  },
  {
    key: CharacterMetricKey.SocialSafety,
    label: CharacterMetricLabel.Security,
    icon: ShieldCheck,
    color: CharacterMetricColor.Teal,
    lowLabel: CharacterMetricLowLabel.Threatened,
    highLabel: CharacterMetricHighLabel.Safe,
  },
  {
    key: CharacterMetricKey.MoralAlignment,
    label: CharacterMetricLabel.Integrity,
    icon: Scale,
    color: CharacterMetricColor.Indigo,
    lowLabel: CharacterMetricLowLabel.Compromised,
    highLabel: CharacterMetricHighLabel.Aligned,
  },
  {
    key: CharacterMetricKey.Transformation,
    label: CharacterMetricLabel.ArcProgress,
    icon: TrendingUp,
    color: CharacterMetricColor.Emerald,
    lowLabel: CharacterMetricLowLabel.Start,
    highLabel: CharacterMetricHighLabel.Complete,
  },
]

export { StorytellerConfirmCopy, StorytellerConfirmVariant }
