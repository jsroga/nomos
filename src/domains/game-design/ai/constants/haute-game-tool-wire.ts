export enum HauteGameToolId {
  DesignAtomicSystems = 'design_atomic_systems',
  DesignWorldMemory = 'design_world_memory',
  DesignMoralChoices = 'design_moral_choices',
  DesignStrandConnections = 'design_strand_connections',
  DesignImplicitTutorial = 'design_implicit_tutorial',
  DesignMeaningfulMundane = 'design_meaningful_mundane',
}

export enum HauteGameComplexityTarget {
  Minimal = 'minimal',
  Moderate = 'moderate',
  Complex = 'complex',
}

export enum HauteGameVerbNounCount {
  Minimal = '3-5',
  Moderate = '5-8',
  Complex = '8-12',
}

export enum HauteGameTimeScope {
  Session = 'session',
  Campaign = 'campaign',
  Persistent = 'persistent',
}

export enum HauteGameStakesLevel {
  Personal = 'personal',
  Local = 'local',
  Regional = 'regional',
  World = 'world',
}

export enum HauteGameMultiplayerModel {
  None = 'none',
  Async = 'async',
  Coop = 'coop',
  Competitive = 'competitive',
}

export enum HauteGamePersistenceLevel {
  Session = 'session',
  Server = 'server',
  Global = 'global',
}

export enum HauteGameSkillCurve {
  Gentle = 'gentle',
  Moderate = 'moderate',
  Steep = 'steep',
}

export enum HauteGamePacing {
  Meditative = 'meditative',
  Balanced = 'balanced',
  Intense = 'intense',
}

export enum HauteGameCopy {
  GameConceptDescribe = 'Brief description of the game concept',
  GenreDescribe = 'Game genre',
  NoneYet = 'None yet',
  NewGame = 'New game',
  ToBeDesigned = 'To be designed',
  DesignFactionsAsNeeded = 'Design factions as needed',
  DefaultGenre = 'Fantasy RPG',
  GameTypeDescribe = 'Type of game (survival, adventure, etc.)',
  ConnectionThemeDescribe = 'Thematic reason for connection',
  UnspecifiedConnections = 'Unspecified - design thematically appropriate connections',
  SituationDescribe = 'The dilemma or conflict situation',
  GameThemeDescribe = 'Core emotional theme of the game',
  DefaultSurvivalGenre = 'Survival/Discovery',
}

export enum HauteGameExpansionHint {
  Depth = '(Make existing systems more nuanced and layered)',
  Breadth = '(Add new parallel systems and variety)',
  Complexity = '(Increase interconnection and emergent gameplay)',
}
