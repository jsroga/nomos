export enum CrossDomainContextLog {
  FetchFailed = '[CrossDomainContext] Failed to fetch entities',
  BuildError = '[CrossDomainContext] Error building context:',
}

export enum CrossDomainXmlTag {
  Root = 'cross_domain_context',
  ProjectEntities = 'project_entities',
  Characters = 'characters',
  Character = 'character',
  Locations = 'locations',
  Location = 'location',
  Mechanics = 'mechanics',
  Mechanic = 'mechanic',
  Factions = 'factions',
  Faction = 'faction',
  Items = 'items',
  Item = 'item',
  Quests = 'quests',
  Quest = 'quest',
  Description = 'description',
  Metadata = 'metadata',
  UsedIn = 'used_in',
}

export enum GameEntityTypeKey {
  Character = 'character',
  Location = 'location',
  Mechanic = 'mechanic',
  Faction = 'faction',
  Item = 'item',
  Quest = 'quest',
}

export enum XmlEscapeEntity {
  Amp = '&amp;',
  Lt = '&lt;',
  Gt = '&gt;',
  Quot = '&quot;',
  Apos = '&apos;',
}

export const CROSS_DOMAIN_ENTITIES_API_PATH = '/api/entities'
