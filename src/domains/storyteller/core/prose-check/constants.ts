export enum DroppedThreadExemptBeatType {
  Climax = 'climax',
  Resolution = 'resolution',
}

export const CHAPTER_MARK_PATTERN = /第\d+章/u

export enum CommonEnglishToken {
  This = 'this',
  That = 'that',
  With = 'with',
  From = 'from',
  When = 'when',
  Then = 'then',
  Than = 'than',
  Them = 'them',
  They = 'they',
  Their = 'their',
  There = 'there',
  These = 'these',
  Those = 'those',
  Have = 'have',
  Been = 'been',
  Were = 'were',
  Will = 'will',
  Would = 'would',
  Could = 'could',
  Should = 'should',
  About = 'about',
  Into = 'into',
}

export const COMMON_ENGLISH_TOKENS = new Set<string>(Object.values(CommonEnglishToken))

export const AUTHOR_TRUTH_TOKEN_PATTERN = /[A-Za-z][A-Za-z0-9]{3,}/g

export enum CausalFindingCopy {
  OrphanWhat = 'The draft beat has no causal parent.',
  OrphanWhy = 'Sequence > 1 with empty causalDependencies is an orphan.',
  OrphanDirection = 'Name the beat this draft depends on.',
  ForwardWhat = 'A beat depends on a later or same-sequence beat.',
  ForwardWhy = 'Forward causal dependency.',
  ForwardDirection = 'Point causalDependencies at an earlier beat.',
  DroppedWhat = 'Nothing later depends on this beat.',
  DroppedWhy = 'Dropped thread: in-degree 0 on a mid-sequence beat.',
  DroppedDirection = 'Give a later beat a causal edge here, or cut the beat.',
}

export enum HygieneFindingCopy {
  ChapterWhat = 'The draft contains a chapter-number mark.',
  ChapterWhy = 'Script beats must not leak 第N章 numbering.',
  ChapterDirection = 'Remove the chapter mark; keep scene sluglines.',
}

export enum SetupFindingCopy {
  MissingPayoffWhat = 'A plant has no payoff yet.',
  MissingPayoffDirection = 'Pay it off in a later beat, or wait — open plants are normal mid-episode.',
  OrphanedSetupWhat = 'A payoff has no matching setup row.',
  OrphanedSetupDirection = 'Plant this earlier, or drop the payoff.',
}

export enum ViewpointFindingCopy {
  OverreachWhat = 'The draft names an author-truth token the POV cannot know.',
  OverreachDirection = 'Cut the leak or reveal it through what the POV can observe.',
}
