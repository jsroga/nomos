import { logger } from '@trigger.dev/sdk'
import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import {
  GeneratePortraitColumn,
  GeneratePortraitError,
  GeneratePortraitLog,
  GeneratePortraitTable,
} from './constants/generate-portrait-wire'

export enum PersistCharacterPortraitRetry {
  Attempts = 3,
  BaseDelayMs = 500,
}

export function isPortraitDbWriteConfirmed(row: unknown, expectedUrl: string): boolean {
  const rec = recordFromJson(row)
  return readString(rec[GeneratePortraitColumn.PortraitUrl]) === expectedUrl
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

async function writeCharacterPortraitRow(input: {
  characterId: string
  portraitUrl: string
}): Promise<void> {
  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase
    .from(GeneratePortraitTable.Characters)
    .update({
      [GeneratePortraitColumn.PortraitUrl]: input.portraitUrl,
      [GeneratePortraitColumn.UpdatedAt]: new Date().toISOString(),
    })
    .eq(GeneratePortraitColumn.Id, input.characterId)
    .select(GeneratePortraitColumn.PortraitUrl)
    .maybeSingle()

  if (error) throw error
  if (!isPortraitDbWriteConfirmed(data, input.portraitUrl)) {
    throw new Error(GeneratePortraitError.CharacterNotFound)
  }
}

export async function persistCharacterPortraitToDatabase(input: {
  characterId: string
  portraitUrl: string
}): Promise<void> {
  let lastError: unknown
  for (let attempt = 0; attempt < PersistCharacterPortraitRetry.Attempts; attempt += 1) {
    try {
      await writeCharacterPortraitRow(input)
      logger.info(GeneratePortraitLog.DbUpdated, {
        characterId: input.characterId,
        storedUrl: input.portraitUrl,
      })
      return
    } catch (dbError) {
      lastError = dbError
      logger.error(GeneratePortraitLog.DbFailed, {
        characterId: input.characterId,
        error: dbError,
        attempt,
      })
      if (attempt < PersistCharacterPortraitRetry.Attempts - 1) {
        await delay(PersistCharacterPortraitRetry.BaseDelayMs * (attempt + 1))
      }
    }
  }
  throw new Error(`${GeneratePortraitError.DbUpdateFailed}: ${getErrorMessage(lastError)}`)
}
