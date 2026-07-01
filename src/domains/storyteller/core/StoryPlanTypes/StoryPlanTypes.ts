export interface WorldRule {
  category: string
  rule: string
  consequence: string
  exceptions?: string | null
}

export interface Faction {
  id?: string
  name: string
  description: string
  ideology: string
  goals: string[]
  resources: string
  weaknesses?: string | null
  rivals?: string[] | null
}

export interface SoundtrackTrack {
  title: string
  artist: string
  youtubeUrl: string
  mood?: string | null
}

export interface InspirationItem {
  title: string
  description: string
}

export interface KeyCharacter {
  name: string
  role: string
  archetype: string
  motivation: string
  factionId: string | null
}

export interface StorySequence {
  id: number
  name: string
  description: string
  keyFactionsInvolved: string[]
  worldConsequence: string
  consequences?: string[] | null
  logline?: string | null
  thematicFocus?: string | null
  mainPlotBeat?: string | null
  bPlotBeat?: string | null
  keyScenes?: string[] | null
  hook?: string | null
  cliffhanger?: string | null
  reasoning?: string | null
  actStructure?: string | null
  protagonistHook?: string | null
  antagonistMove?: string | null
  fatalFlaw?: string | null
  thematicQuestion?: string | null
}

export interface EpisodePremise {
  title: string
  logline: string
  theHook: string
  theTurn: string
  theAftermath: string
  protagonistHook: string | null
  fatalFlaw: string
  stakes: string
  transformation: string
  inevitableConsequence: string
  thematicFocus: string
  charactersInvolved: string[]
  tenPointsPlan: Array<string | Record<string, string>>
}

export interface StoryPlan {
  title: string
  genre: string
  tone: string
  centralQuestion: string
  worldRules: WorldRule[]
  factions: Faction[]
  keyCharacters: KeyCharacter[]
  protagonist?:
    | {
        name: string
        want: string
        need: string
        flaw: string
      }
    | null
  antagonist?:
    | {
        name: string
        motivation: string
      }
    | null
  sequences?: StorySequence[] | null
  executiveSummary?: string | null
  plotTwists?: string[] | null
  worldDescription?: string | null
  inspirations?: {
    books?: Array<string | InspirationItem> | null
    movies?: Array<string | InspirationItem> | null
    games?: Array<string | InspirationItem> | null
  } | null
  moodSoundtrack?: string | null
  soundtracks?: SoundtrackTrack[] | null
  moodImages?: string[] | null
  premise?: EpisodePremise | null
}
