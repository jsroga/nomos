/** Thresholds and copy for beat-board generation from an episode premise. */

export enum BeatboardPremiseMin {
  ProseChars = 20,
  ShortChars = 12,
  TenPoints = 8,
}

export enum BeatboardPremiseRequirement {
  Logline = 'logline',
  ProtagonistHook = 'protagonist hook',
  FatalFlaw = 'fatal flaw',
  Stakes = 'stakes',
  InevitableConsequence = 'inevitable consequence',
  TenPointsPlan = '10-point plan (at least 8 beats)',
}

export enum BeatboardPremiseFieldKey {
  Logline = 'logline',
  ProtagonistHook = 'protagonistHook',
  FatalFlaw = 'fatalFlaw',
  Stakes = 'stakes',
  InevitableConsequence = 'inevitableConsequence',
  TenPointsPlan = 'tenPointsPlan',
  Premise = 'premise',
}

export enum BeatboardPremiseValidationCopy {
  NoPremise = 'Can\'t generate the beat board — this episode has no premise yet. Generate a full episode premise on the Plan tab first.',
  TooThin = 'Can\'t generate the beat board — the episode premise isn\'t detailed enough.',
  MissingPrefix = 'Missing: ',
  ListJoin = ', ',
  MessageEnd = '.',
}
