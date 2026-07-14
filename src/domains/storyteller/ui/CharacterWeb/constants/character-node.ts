import type { LucideIcon } from 'lucide-react'
import { User, Users, MapPin, Calendar, Scroll } from 'lucide-react'
import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'

export const CHARACTER_NODE_DEFAULT_NAME = 'Unknown'

export const CHARACTER_NODE_DEFAULT_TYPE = StoryEntityType.Character

export interface CharacterNodeTypeStyle {
  bg: string
  border: string
  iconBg: string
  Icon: LucideIcon
}

export const CHARACTER_NODE_TYPE_STYLES: Record<StoryEntityType, CharacterNodeTypeStyle> = {
  [StoryEntityType.Character]: {
    bg: 'bg-purple-950/80',
    border: 'border-purple-700/50',
    iconBg: 'bg-purple-800',
    Icon: User,
  },
  [StoryEntityType.Faction]: {
    bg: 'bg-blue-950/80',
    border: 'border-blue-700/50',
    iconBg: 'bg-blue-800',
    Icon: Users,
  },
  [StoryEntityType.Place]: {
    bg: 'bg-emerald-950/80',
    border: 'border-emerald-700/50',
    iconBg: 'bg-emerald-800',
    Icon: MapPin,
  },
  [StoryEntityType.Event]: {
    bg: 'bg-amber-950/80',
    border: 'border-amber-700/50',
    iconBg: 'bg-amber-800',
    Icon: Calendar,
  },
  [StoryEntityType.Rule]: {
    bg: 'bg-rose-950/80',
    border: 'border-rose-700/50',
    iconBg: 'bg-rose-800',
    Icon: Scroll,
  },
  [StoryEntityType.Beat]: {
    bg: 'bg-purple-950/80',
    border: 'border-purple-700/50',
    iconBg: 'bg-purple-800',
    Icon: User,
  },
  [StoryEntityType.Episode]: {
    bg: 'bg-purple-950/80',
    border: 'border-purple-700/50',
    iconBg: 'bg-purple-800',
    Icon: User,
  },
  [StoryEntityType.Item]: {
    bg: 'bg-purple-950/80',
    border: 'border-purple-700/50',
    iconBg: 'bg-purple-800',
    Icon: User,
  },
}

export const CHARACTER_NODE_DEFAULT_STYLE =
  CHARACTER_NODE_TYPE_STYLES[StoryEntityType.Character]
