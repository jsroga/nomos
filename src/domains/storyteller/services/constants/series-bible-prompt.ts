/** Series bible prompt assembly wire copy and template tokens. */

import { ListSeparator } from '@/domains/storyteller/agents/constants/agent-identity'
import {
  StorytellerDefaultTitle,
  StorytellerTextSeparator,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { ContextAssemblyFallback } from '@/domains/storyteller/services/constants/context-assembly'

export enum SeriesBiblePromptCopy {
  NoBibleYet =
    'No series bible has been established yet. Describe your world concept to begin generating.',
  NotDefined = 'Not defined',
  NotSpecified = 'Not specified',
  Theme = 'Theme',
  Unknown = 'unknown',
  Transform = 'transform',
  UnknownRole = 'Unknown role',
  NoDescription = 'No description',
  EndMarker = '\n=== END SERIES BIBLE ===',
  GameTilePrefix = 'Isometric game tile: ',
  GameTileSuffix = '. Tileable 2D game environment.',
  FantasyLandscapeFallback = 'detailed fantasy world landscape with unique terrain',
}

export enum SeriesBiblePromptSection {
  Header = '\n=== STORY BIBLE: ',
  HeaderClose = ' ===\n\nLOGLINE: ',
  Logline = '\n\nPREMISE: ',
  Genre = '\n\nGENRE: ',
  Tone = '\nTONE: ',
  ThematicCore = '\n--- THEMATIC CORE ---\nCentral Theme: ',
  CentralQuestion = '\nCentral Question: ',
  ThematicElements = '\nThematic Elements:\n',
  Setting = '\n--- SETTING ---\nTime: ',
  Place = '\nPlace: ',
  SocialContext = '\nSocial Context: ',
  WorldRules = '\n--- WORLD RULES ---\n',
  WorldDescription = '\n--- WORLD DESCRIPTION ---\n',
  Inspirations = '\n--- INSPIRATIONS ---\n',
  Books = 'Books: ',
  Movies = 'Movies: ',
  Games = 'Games: ',
  Soundtrack = '\nSoundtrack / Mood: ',
  CharacterArcs = '\n--- CHARACTER ARCS ---\n',
  ToneGuidelines = '\n--- TONE GUIDELINES ---\nViolence: ',
  Humor = '\nHumor: ',
  Dialogue = '\nDialogue: ',
  VisualMotifs = '\nVisual Motifs: ',
  CinematicInfluences = 'Cinematic Influences: ',
  Cast = '\n--- CAST ---\n',
}

export enum SeriesBibleArcField {
  StartBelief = '  START: Believes "',
  StartWant = '", wants "',
  StartNeed = '", needs "',
  Flaw = '  FLAW: ',
  Lie = '  LIE: "',
  EndTruth = '  END: Must realize "',
  EndTransform = '" and ',
}

export enum SeriesBibleLinkStripReplacement {
  BracketRef = '$1',
  MarkdownLink = '$1',
}

export const SERIES_BIBLE_LIST_SEPARATOR = ListSeparator.CommaSpace
export const SERIES_BIBLE_MOTIF_SEPARATOR = StorytellerTextSeparator.CommaSpace
export const SERIES_BIBLE_SETTING_SEPARATOR = StorytellerTextSeparator.PeriodSpace
export const SERIES_BIBLE_DEFAULT_TITLE = StorytellerDefaultTitle.Untitled
export const SERIES_BIBLE_RULE_LABEL = ContextAssemblyFallback.RuleLabel
