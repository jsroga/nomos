import type { MentionItem } from '@/shared/chat'

export const MENTION_CATEGORY_ENTITY = 'entity'
export const MENTION_CATEGORY_AGENT = 'agent'
export const MENTION_CATEGORY_SECTION = 'section'

export const ENTITY_TYPE = {
  MECHANIC: 'mechanic',
  LOOP: 'loop',
  CONNECTION: 'connection',
} as const

export type LoopCreatorEntityType = (typeof ENTITY_TYPE)[keyof typeof ENTITY_TYPE]

export const ENTITY_TYPE_ICONS: Record<LoopCreatorEntityType, string> = {
  [ENTITY_TYPE.MECHANIC]: 'Cog',
  [ENTITY_TYPE.LOOP]: 'RefreshCw',
  [ENTITY_TYPE.CONNECTION]: 'GitBranch',
}

export const ENTITY_ID_PREFIX_MECHANIC = 'mech'
export const ENTITY_ID_PREFIX_LOOP = 'loop'
export const ENTITY_ID_PREFIX_CONNECTION = 'conn'

export const CONNECTION_NAME_PREFIX = 'Connection_'
export const CONNECTION_LABEL_SEPARATOR = '→'
export const CONNECTION_PREVIEW_MAX_LENGTH = 30
export const CONNECTION_ID_SLICE_LENGTH = 6

export const LOOP_CREATOR_AGENT_MENTION_CATALOG: MentionItem[] = [
  {
    id: 'agent-loop-planner',
    name: 'loop_planner',
    category: MENTION_CATEGORY_AGENT,
    type: 'loop_planner',
    icon: 'Layout',
    preview: 'Loop architecture',
  },
  {
    id: 'agent-balance',
    name: 'balance_analyst',
    category: MENTION_CATEGORY_AGENT,
    type: 'balance_analyst',
    icon: 'Scale',
    preview: 'Game balance',
  },
  {
    id: 'agent-market',
    name: 'market_analyst',
    category: MENTION_CATEGORY_AGENT,
    type: 'market_analyst',
    icon: 'TrendingUp',
    preview: 'Market research',
  },
  {
    id: 'agent-mechanic',
    name: 'mechanic_generator',
    category: MENTION_CATEGORY_AGENT,
    type: 'mechanic_generator',
    icon: 'Cog',
    preview: 'Create mechanics',
  },
]

export const SECTION_BALANCE_ANALYSIS = 'balanceAnalysis'
export const SECTION_GAME_CONTEXT = 'gameContext'
export const SECTION_ALL_MECHANICS = 'allMechanics'
export const SECTION_ALL_LOOPS = 'allLoops'

export const SECTION_TYPE_MECHANICS = 'mechanics'
export const SECTION_TYPE_LOOPS = 'loops'

export const SECTION_ID_PREFIX = 'section-'

export const SECTION_ICON_BALANCE = 'BarChart'
export const SECTION_ICON_GAME_CONTEXT = 'Gamepad2'
export const SECTION_ICON_MECHANICS = 'Cog'
export const SECTION_ICON_LOOPS = 'RefreshCw'

export const SECTION_PREVIEW_AVAILABLE = 'Available'
export const SECTION_PREVIEW_NOT_GENERATED = 'Not generated'
export const SECTION_PREVIEW_NOT_DEFINED = 'Not defined'

export const SECTION_COUNT_LABEL_MECHANICS = 'mechanics'
export const SECTION_COUNT_LABEL_LOOPS = 'loops'

export const SECTION_FILTER_ALIASES = {
  balanceAnalysis: ['balance', 'analysis'],
  gameContext: ['game', 'context'],
  allMechanics: ['mechanics', 'all'],
  allLoops: ['loops', 'all'],
} as const
