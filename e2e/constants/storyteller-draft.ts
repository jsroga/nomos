/** Draft tab selectors, mode labels, and keys for storyteller-draft e2e. */

export enum DraftUiLabel {
  Premise = 'Premise',
  Beats = 'Beats',
  Draft = 'Draft',
  DraftLocked = 'Complete Beats to unlock Draft',
  Script = 'Script',
  Novel = 'Novel',
  GenerateNext = 'Generate next',
  RegenerateSection = 'Regenerate this section',
  BeatsGate = 'Beats is the gate',
  AddBeat = 'Add Beat',
  ModeGroup = 'Manuscript mode',
  Approve = 'Approve',
  GhostHint = 'Tab to accept · Esc to dismiss',
}

export enum DraftWidthToken {
  Script = '72ch',
  Novel = '65ch',
}

export enum DraftSelector {
  ScriptEditor = '.script-editor',
}

export enum DraftKey {
  Tab = 'Tab',
  Escape = 'Escape',
}

export enum DraftTest {
  Describe = 'Storyteller Draft',
  ModeSwitch = 'mode switch restyles Script and Novel',
  GenerateDisabled = 'Generate next is disabled with zero beats',
  GenerateNext = 'Generate next writes into the well',
  RegenerateSection = 'regenerate-section replaces a span',
  GhostAccept = 'Tab accepts a ghost continuation',
  GhostDismiss = 'Escape dismisses a ghost continuation',
}

export enum DraftTimeout {
  Generation = 900_000,
  Ghost = 60_000,
}

export enum DraftRoute {
  ScriptComplete = '**/api/storyteller/script/complete',
}

export enum DraftHttp {
  Json = 'application/json',
}

export enum DraftGhostToken {
  Continuation = 'chapel bells keep time',
}

export enum DraftTypedPrefix {
  Chapel = 'INT. CHAPEL - NIGHT\nVera waits.',
}

export enum DraftGhostField {
  Result = 'result',
}

export enum DraftEpisodeSeed {
  Title = 'E2E Draft Episode',
}

export enum DraftEpisodeSequence {
  First = 1,
}

export enum DraftPhase {
  Writing = 'writing',
}

export enum DraftPlanField {
  EpisodeId = 'episodeId',
  CurrentPhase = 'currentPhase',
}

export enum DraftSkip {
  LiveLlm = 'OpenRouter insufficient credits — skip live beat-draft until the operator tops up',
}
