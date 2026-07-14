export enum ChatPersistenceLog {
  FailedSaveState = '[Chat Persistence] Failed to save state:',
  StateTooOld = '[Chat Persistence] State too old, discarding',
  FailedLoadState = '[Chat Persistence] Failed to load state:',
  FailedClearState = '[Chat Persistence] Failed to clear state:',
  FailedSaveInterruptedStream = '[Chat Persistence] Failed to save interrupted stream:',
  InterruptedStreamTooOld = '[Chat Persistence] Interrupted stream too old, discarding',
  FailedLoadInterruptedStream = '[Chat Persistence] Failed to load interrupted stream:',
  FailedClearInterruptedStream = '[Chat Persistence] Failed to clear interrupted stream:',
}
