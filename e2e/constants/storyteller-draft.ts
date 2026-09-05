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
}

export enum DraftTimeout {
  Generation = 900_000,
}
