import { AsyncLocalStorage } from 'node:async_hooks'
import { metadata } from '@trigger.dev/sdk'
import { readNumber, recordFromJson } from '@/shared/data/json-guards'

export enum GenerateTileStage {
  Initializing = 'initializing',
  AssemblingContext = 'assembling_context',
  GeneratingImage = 'generating_image',
  SubmittingApiframe = 'submitting_apiframe',
  WaitingApiframe = 'waiting_apiframe',
  DownloadingResult = 'downloading_result',
  Uploading = 'uploading',
  CheckingOriginal = 'checking_original',
  Completed = 'completed',
}

export enum GenerateTileProgress {
  Init = 0,
  Generating = 30,
  Submitting = 35,
  Waiting = 45,
  Downloaded = 85,
  Uploading = 90,
  CheckingOriginal = 95,
  Completed = 100,
}

export enum GenerateTileMetadataKey {
  Progress = 'progress',
  Stage = 'stage',
}

const progressFloor = new AsyncLocalStorage<{ value: number }>()

function readExistingProgress(): number {
  return readNumber(recordFromJson(metadata.current())[GenerateTileMetadataKey.Progress]) ?? 0
}

export function runWithTileProgress<T>(fn: () => Promise<T>): Promise<T> {
  return progressFloor.run({ value: readExistingProgress() }, fn)
}

export function nextTileProgress(current: number, next: number): number {
  return next > current ? next : current
}

/** Never decrease progress. Retries and post-download upload must not rewind the bar. */
export async function advanceGenerateTileProgress(
  progress: number,
  stage: GenerateTileStage,
): Promise<void> {
  const floor = progressFloor.getStore()
  const current = floor?.value ?? 0
  const next = nextTileProgress(current, progress)
  if (next !== current) {
    if (floor) floor.value = next
    await metadata.set(GenerateTileMetadataKey.Progress, next)
  }
  await metadata.set(GenerateTileMetadataKey.Stage, stage)
}
