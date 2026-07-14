/** Aliases for the project cast field. `cast` is canonical at the persistence boundary. */
export enum CastFieldAlias {
  Cast = 'cast',
  Characters = 'characters',
  KeyCharacters = 'keyCharacters',
  KeyCharactersSnake = 'key_characters',
  KeyPlayers = 'keyPlayers',
  KeyPlayersSnake = 'key_players',
}

export const CAST_FIELD_ALIASES: CastFieldAlias[] = [
  CastFieldAlias.Cast,
  CastFieldAlias.Characters,
  CastFieldAlias.KeyCharacters,
  CastFieldAlias.KeyCharactersSnake,
  CastFieldAlias.KeyPlayers,
  CastFieldAlias.KeyPlayersSnake,
]

export enum CastEntryField {
  Name = 'name',
}
