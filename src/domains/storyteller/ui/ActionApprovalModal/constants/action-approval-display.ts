export const HIDDEN_TABLE_FIELD_KEYS = new Set([
  'id',
  'projectId',
  'episodeId',
  'beatId',
  'psychology',
])

export const TABLE_COLUMN_PRIORITIES = [
  'title',
  'name',
  'role',
  'type',
  'category',
  'description',
  'content',
] as const

export const CATEGORY_TABLE_VIEW_NAMES = [
  'Characters',
  'Key Characters',
  'Story',
  'World Rules',
  'Atmosphere',
  'Roadmap',
] as const

export const CATEGORY_TABLE_VIEW_SET = new Set<string>(CATEGORY_TABLE_VIEW_NAMES)

export enum ActionChangeType {
  ADD = 'add',
  MODIFY = 'modify',
  REMOVE = 'remove',
}

export enum ApprovalViewMode {
  SUMMARY = 'summary',
  DIFF = 'diff',
}

export const KEYBOARD_KEY = {
  ESCAPE: 'Escape',
  ENTER: 'Enter',
  DELETE: 'Delete',
  BACKSPACE: 'Backspace',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  TAB: 'Tab',
} as const

export const DOM_EVENT_KEYDOWN = 'keydown'

export const MODAL_DISPLAY_NAME = 'ActionApprovalModal'

export const FIELD_NAME_CAMEL_SPLIT = /([A-Z])/g
export const FIELD_NAME_UNDERSCORE = /_/g
export const FIELD_NAME_WORD_CAP = /\b\w/g
export const FIELD_NAME_SPACE_PREFIX = ' $1'

export const SUMMARY_ITEM_TYPE = {
  CHARACTERS: 'characters',
  KEY_CHARACTERS: 'keyCharacters',
  WORLD_RULES: 'worldRules',
  FACTIONS: 'factions',
  THEMES: 'themes',
  TRAITS: 'traits',
  SOUNDTRACKS: 'soundtracks',
  PLOT_TWISTS: 'plotTwists',
  SEQUENCES: 'sequences',
  EPISODE_ROADMAP: 'episodeRoadmap',
} as const

export const SUMMARY_ITEM_LABEL = {
  CHARACTER: 'character',
  RULE: 'rule',
  FACTION: 'faction',
  THEME: 'theme',
  TRAIT: 'trait',
  TRACK: 'track',
  TWIST: 'twist',
  EPISODE: 'episode',
  ITEM: 'item',
} as const

export const CHANGE_TYPE_BADGE_COPY = {
  [ActionChangeType.ADD]: { label: 'New', className: 'bg-green-500/10 text-green-400' },
  [ActionChangeType.MODIFY]: { label: 'Updated', className: 'bg-blue-500/10 text-blue-400' },
  [ActionChangeType.REMOVE]: { label: 'Removed', className: 'bg-red-500/10 text-red-400' },
} as const

export const FRIENDLY_FIELD_NAMES: Record<string, string> = {
  characters: 'Characters',
  worldRules: 'World Rules',
  factions: 'Factions',
  themes: 'Story Themes',
  tone: 'Narrative Tone',
  genre: 'Genre',
  protagonistHook: 'Protagonist Hook',
  fatalFlaw: 'Fatal Flaw',
  stakes: 'Stakes',
  inevitableConsequence: 'Inevitable Consequence',
  title: 'Title',
  logline: 'Logline',
  theHook: 'The Hook',
  theTurn: 'The Turn',
  theAftermath: 'The Aftermath',
  transformation: 'Character Transformation',
  thematicFocus: 'Thematic Focus',
  name: 'Name',
  role: 'Role',
  traits: 'Character Traits',
  goal: 'Character Goal',
  psychology: 'Psychology Profile',
  content: 'Script Content',
  script: 'Script',
  beatBoard: 'Story Beats',
  premise: 'Episode Premise',
  antagonistMove: 'Antagonist Move',
  thematicQuestion: 'Thematic Question',
  updatedFields: 'Updated Fields',
  soundtracks: 'Soundtracks',
  inspirations: 'Inspirations',
  keyCharacters: 'Key Characters',
  worldDescription: 'World Description',
  plotTwists: 'Plot Twists',
  sequences: 'Episode Roadmap',
  episodeRoadmap: 'Episode Roadmap',
  tenPointsPlan: '10-Point Plan',
}

export const FIELD_CATEGORIES: Record<string, string> = {
  characters: 'Characters',
  psychology: 'Characters',
  traits: 'Characters',
  goal: 'Characters',
  role: 'Characters',
  keyCharacters: 'Characters',
  worldRules: 'World Rules',
  factions: 'World Rules',
  worldDescription: 'World Rules',
  themes: 'Story',
  tone: 'Story',
  genre: 'Story',
  protagonistHook: 'Premise',
  fatalFlaw: 'Premise',
  stakes: 'Premise',
  inevitableConsequence: 'Premise',
  title: 'Premise',
  logline: 'Premise',
  theHook: 'Premise',
  theTurn: 'Premise',
  theAftermath: 'Premise',
  transformation: 'Premise',
  thematicFocus: 'Premise',
  script: 'Script',
  content: 'Script',
  beatBoard: 'Story',
  premise: 'Premise',
  soundtracks: 'Atmosphere',
  inspirations: 'Atmosphere',
  plotTwists: 'Story',
  sequences: 'Roadmap',
  episodeRoadmap: 'Roadmap',
  tenPointsPlan: 'Premise',
}

export const SUMMARY_TABLE_FIELD_KEYS = [
  'characters',
  'keyCharacters',
  'worldRules',
  'factions',
  'plotTwists',
  'soundtracks',
] as const

export const SUMMARY_TABLE_FIELD_KEY_SET = new Set<string>(SUMMARY_TABLE_FIELD_KEYS)

export const EXPANDABLE_ARRAY_FIELD_KEYS = [
  'plotTwists',
  'worldRules',
  'factions',
  'soundtracks',
  'sequences',
] as const

export const EXPANDABLE_ARRAY_FIELD_KEY_SET = new Set<string>(EXPANDABLE_ARRAY_FIELD_KEYS)

export const SUMMARY_VERB = {
  ADDED: 'added',
  UPDATED: 'updated',
} as const

export const ENTITY_TYPE = {
  BEAT: 'beat',
  CHARACTER: 'character',
} as const

export const ARRAY_ITEM_FALLBACK_KEY = 'new'

export const TABLE_COLUMN_PRIORITY_INDEX = new Map<string, number>(
  TABLE_COLUMN_PRIORITIES.map((column, index) => [column, index])
)

export const TECHNICAL_PAYLOAD_KEYS = new Set([
  'id',
  'beatId',
  'characterId',
  'projectId',
  'episodeId',
  '_before',
])

export const ENTITY_CATEGORY_STORY = 'Story'
export const ENTITY_CATEGORY_CHARACTERS = 'Characters'
export const ENTITY_CATEGORY_GENERAL = 'General'
export const ENTITY_CATEGORY_ROADMAP = 'Roadmap'

export const EMPTY_VALUE_LABEL = '(empty)'
export const ACTION_DATA_LABEL = 'Action Data'
export const NEW_EPISODE_LABEL = 'New Episode'
export const SEASON_STRUCTURE_LABEL = 'Season Structure'
export const NEW_ITEM_LABEL = 'New Item'
export const PAYLOAD_PATH = 'payload'

export const ACTION_PREFIX_UPDATE = 'UPDATE_'
export const ACTION_PREFIX_CREATE = 'CREATE_'
export const ACTION_PREFIX_DELETE = 'DELETE_'

export const EPISODE_ROADMAP_FIELD = 'episodeRoadmap'
export const EPISODES_FIELD = 'episodes'
export const SEASON_STRUCTURE_FIELD = 'seasonStructure'

export const ARRAY_ITEM_LABEL_KEYS = ['id', 'title', 'name'] as const
export const ARRAY_ITEM_FRIENDLY_KEYS = ['title', 'name', 'rule'] as const
export const EPISODE_TITLE_KEYS = ['title'] as const

export const DIFF_VIEWER_STYLES = {
  variables: {
    dark: {
      diffViewerBackground: 'transparent',
      diffViewerColor: 'hsl(var(--foreground))',
      addedBackground: 'rgba(34, 197, 94, 0.08)',
      addedColor: 'rgb(134, 239, 172)',
      removedBackground: 'rgba(239, 68, 68, 0.08)',
      removedColor: 'rgb(252, 165, 165)',
      wordAddedBackground: 'rgba(34, 197, 94, 0.25)',
      wordRemovedBackground: 'rgba(239, 68, 68, 0.25)',
      addedGutterBackground: 'rgba(34, 197, 94, 0.15)',
      removedGutterBackground: 'rgba(239, 68, 68, 0.15)',
      gutterBackground: 'hsl(var(--muted)/0.3)',
      gutterColor: 'hsl(var(--muted-foreground))',
      codeFoldGutterBackground: 'hsl(var(--muted)/0.5)',
      codeFoldBackground: 'hsl(var(--muted)/0.3)',
      emptyLineBackground: 'transparent',
      highlightBackground: 'rgba(59, 130, 246, 0.1)',
      highlightGutterBackground: 'rgba(59, 130, 246, 0.2)',
    },
  },
  diffContainer: {
    borderRadius: '0',
    border: 'none',
  },
  line: {
    padding: '4px 12px',
    fontSize: '13px',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    lineHeight: '1.6',
  },
  gutter: {
    padding: '4px 12px',
    minWidth: '40px',
    fontSize: '11px',
  },
  wordDiff: {
    padding: '2px 4px',
    borderRadius: '3px',
  },
  contentText: {
    lineHeight: '1.6',
  },
} as const
