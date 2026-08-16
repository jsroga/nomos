import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Calendar,
  Film,
  MapPin,
  Scroll,
  User,
  Users,
} from 'lucide-react'
import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import {
  ReferenceSegmentType,
  type EntityType as ParsedEntityType,
} from '@/domains/storyteller/core/entities/constants/reference-parser'
import { StorytellerRelationshipType } from '@/domains/storyteller/services/constants/relationship-enricher'
import { StorytellerTextSeparator } from '@/domains/storyteller/core/storyteller-page-wire'
import { HttpMethod } from '@/shared/data/constants/protocol'
import { RichTextContainerTag } from '@/domains/storyteller/ui/RichText/constants/rich-text'

const DOM_EVENT_KEYDOWN = 'keydown'

export enum ReferenceTextKeyboardKey {
  Alt = 'Alt',
}

export const REFERENCE_TEXT_DOM_EVENT_KEYUP = 'keyup'

/** Delay before closing so the pointer can move onto the tooltip. */
export const REFERENCE_TOOLTIP_CLOSE_DELAY_MS = 300

/** Surrounding text sent to resolve — keep the GET query short. */
export const REFERENCE_RESOLVE_CONTEXT_MAX = 500

export enum ReferenceTextMetaLabel {
  Role = 'Role',
  Motivation = 'Motivation',
  FatalFlaw = 'Fatal Flaw',
  Power = 'Power',
  Politics = 'Politics',
  Resources = 'Resources',
  Goals = 'Goals',
  Weakness = 'Weakness',
}

export enum RelationshipTypePluralLabel {
  Allies = 'Allies',
  Enemies = 'Enemies',
  Rivals = 'Rivals',
  Mentors = 'Mentors',
  Students = 'Students',
  Lovers = 'Lovers',
  Family = 'Family',
  MemberOf = 'Member of',
  LeaderOf = 'Leads',
  AssociatedWith = 'Associated with',
  RelatedTo = 'Related to',
  ComplexRelationship = 'Complex relationship',
  CloselyConnected = 'Closely connected to',
  Acquaintances = 'Acquaintances',
  Strangers = 'Strangers',
}

export const RELATIONSHIP_TYPE_PLURAL_LABELS: Record<string, string> = {
  [StorytellerRelationshipType.Ally]: RelationshipTypePluralLabel.Allies,
  [StorytellerRelationshipType.Enemy]: RelationshipTypePluralLabel.Enemies,
  [StorytellerRelationshipType.Rival]: RelationshipTypePluralLabel.Rivals,
  [StorytellerRelationshipType.Mentor]: RelationshipTypePluralLabel.Mentors,
  [StorytellerRelationshipType.Student]: RelationshipTypePluralLabel.Students,
  [StorytellerRelationshipType.Lover]: RelationshipTypePluralLabel.Lovers,
  [StorytellerRelationshipType.Family]: RelationshipTypePluralLabel.Family,
  [StorytellerRelationshipType.MemberOf]: RelationshipTypePluralLabel.MemberOf,
  [StorytellerRelationshipType.LeaderOf]: RelationshipTypePluralLabel.LeaderOf,
  [StorytellerRelationshipType.Associated]: RelationshipTypePluralLabel.AssociatedWith,
  associated_with: RelationshipTypePluralLabel.AssociatedWith,
  [StorytellerRelationshipType.Related]: RelationshipTypePluralLabel.RelatedTo,
  [StorytellerRelationshipType.Complex]: RelationshipTypePluralLabel.ComplexRelationship,
  closely_connected: RelationshipTypePluralLabel.CloselyConnected,
  [StorytellerRelationshipType.Acquaintance]: RelationshipTypePluralLabel.Acquaintances,
  [StorytellerRelationshipType.Stranger]: RelationshipTypePluralLabel.Strangers,
}

export const ENTITY_ICONS: Partial<
  Record<ParsedEntityType, React.ComponentType<{ className?: string; size?: number }>>
> = {
  [StoryEntityType.Character]: User,
  [StoryEntityType.Place]: MapPin,
  [StoryEntityType.Event]: Calendar,
  [StoryEntityType.Faction]: Users,
  [StoryEntityType.Rule]: Scroll,
  [StoryEntityType.Beat]: Film,
  [StoryEntityType.Episode]: BookOpen,
}

export const ENTITY_COLORS: Partial<Record<ParsedEntityType, string>> = {
  [StoryEntityType.Character]:
    'text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20',
  [StoryEntityType.Place]:
    'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20',
  [StoryEntityType.Event]:
    'text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20',
  [StoryEntityType.Faction]:
    'text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20',
  [StoryEntityType.Rule]:
    'text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20',
  [StoryEntityType.Beat]:
    'text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20',
  [StoryEntityType.Episode]:
    'text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20',
}

export const REFERENCE_TEXT_DEFAULT_COLOR =
  'text-gray-400 hover:text-gray-300 bg-gray-500/10 hover:bg-gray-500/20'

export const REFERENCE_TEXT_DEFAULT_ENTITY_TYPE = StoryEntityType.Character

export const REFERENCE_TEXT_DEFAULT_ICON: LucideIcon = User

export const REFERENCE_TEXT_DEFAULT_RELATIONSHIP_TYPE = StorytellerRelationshipType.Related

export enum ReferenceTextTooltipCopy {
  Loading = 'Loading...',
  ArchetypePrefix = 'Archetype:',
  MotivationPrefix = 'Motivation:',
  FatalFlawPrefix = 'Fatal Flaw:',
  TraitsPrefix = 'Traits:',
  GoalsPrefix = 'Goals:',
  ResourcesPrefix = 'Resources:',
  ImpactPrefix = 'Impact:',
  DatePrefix = 'Date:',
  ConsequencePrefix = 'Consequence:',
  InThisContext = 'In this context',
  Relationships = 'Relationships',
}

export enum ReferenceTextFallbackColor {
  Gray = 'text-gray-400',
}

export {
  ReferenceSegmentType,
  StoryEntityType,
  StorytellerTextSeparator,
  HttpMethod,
  DOM_EVENT_KEYDOWN,
  RichTextContainerTag,
}
