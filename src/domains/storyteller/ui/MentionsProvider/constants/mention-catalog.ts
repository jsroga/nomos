import type { MentionItem } from '@/shared/chat'

export const MENTION_CATEGORY_ENTITY = 'entity'
export const MENTION_CATEGORY_AGENT = 'agent'
export const MENTION_CATEGORY_SECTION = 'section'

export const ENTITY_TYPE = {
  CHARACTER: 'character',
  PLACE: 'place',
  EVENT: 'event',
  FACTION: 'faction',
  RULE: 'rule',
  BEAT: 'beat',
  EPISODE: 'episode',
} as const

export type StorytellerEntityType = (typeof ENTITY_TYPE)[keyof typeof ENTITY_TYPE]

export const ENTITY_TYPE_ICONS: Record<StorytellerEntityType, string> = {
  [ENTITY_TYPE.CHARACTER]: 'User',
  [ENTITY_TYPE.PLACE]: 'MapPin',
  [ENTITY_TYPE.EVENT]: 'Calendar',
  [ENTITY_TYPE.FACTION]: 'Users',
  [ENTITY_TYPE.RULE]: 'Scroll',
  [ENTITY_TYPE.BEAT]: 'Zap',
  [ENTITY_TYPE.EPISODE]: 'Tv',
}

export const STORYTELLER_AGENT_MENTION_CATALOG: MentionItem[] = [
  {
    id: 'agent-writer',
    name: 'writer',
    category: MENTION_CATEGORY_AGENT,
    type: 'writer',
    icon: 'PenTool',
    preview: 'Script & dialogue',
  },
  {
    id: 'agent-premise',
    name: 'premise_architect',
    category: MENTION_CATEGORY_AGENT,
    type: 'premise_architect',
    icon: 'Building2',
    preview: 'World building',
  },
  {
    id: 'agent-plot',
    name: 'plot_architect',
    category: MENTION_CATEGORY_AGENT,
    type: 'plot_architect',
    icon: 'Map',
    preview: 'Story structure',
  },
  {
    id: 'agent-devils',
    name: 'devils_advocate',
    category: MENTION_CATEGORY_AGENT,
    type: 'devils_advocate',
    icon: 'AlertTriangle',
    preview: 'Critical review',
  },
  {
    id: 'agent-episode',
    name: 'episode_premise_architect',
    category: MENTION_CATEGORY_AGENT,
    type: 'episode_premise_architect',
    icon: 'FileEdit',
    preview: 'Episode premises',
  },
  {
    id: 'agent-psychology',
    name: 'character_psychology',
    category: MENTION_CATEGORY_AGENT,
    type: 'character_psychology',
    icon: 'User',
    preview: 'Character analysis',
  },
]

export const SECTION_WORLD_RULES = 'worldRules'
export const SECTION_INSPIRATIONS = 'inspirations'
export const SECTION_SOUNDTRACKS = 'soundtracks'
export const SECTION_PLOT_TWISTS = 'plotTwists'

export const SECTION_ICON_SCROLL = 'Scroll'
export const SECTION_ICON_LIGHTBULB = 'Lightbulb'
export const SECTION_ICON_MUSIC = 'Music'
export const SECTION_ICON_SHUFFLE = 'Shuffle'

export const SECTION_FILTER_ALIASES = {
  worldRules: ['worldrules', 'rules'],
  inspirations: ['inspirations'],
  soundtracks: ['soundtracks', 'music'],
  plotTwists: ['plottwists', 'twists'],
} as const

export const DEFAULT_ENTITY_ICON = 'Hash'
