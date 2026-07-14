export enum DeepMergeIdentifierKey {
  Id = 'id',
  Name = 'name',
  Rule = 'rule',
  Title = 'title',
}

export const DEEP_MERGE_IDENTIFIER_KEYS = [
  DeepMergeIdentifierKey.Id,
  DeepMergeIdentifierKey.Name,
  DeepMergeIdentifierKey.Rule,
  DeepMergeIdentifierKey.Title,
] as const
