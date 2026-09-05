import { z } from 'zod'
import { recordFromJson, readNumber, readString, stringArrayFromJson } from '@/shared/data/json-guards'

export const VoiceFingerprintSchema = z.object({
  register: z.string().default(''),
  sentenceLengthHabit: z.number().default(0),
  favouredLexicon: z.array(z.string()).default([]),
  forbiddenLexicon: z.array(z.string()).default([]),
  sampleLines: z.array(z.string()).max(3).default([]),
})

export type VoiceFingerprint = z.infer<typeof VoiceFingerprintSchema>

export const EMPTY_VOICE_FINGERPRINT: VoiceFingerprint = {
  register: '',
  sentenceLengthHabit: 0,
  favouredLexicon: [],
  forbiddenLexicon: [],
  sampleLines: [],
}

export function voiceFingerprintFromUnknown(value: unknown): VoiceFingerprint {
  if (typeof value === 'string') {
    return { ...EMPTY_VOICE_FINGERPRINT, register: value }
  }
  const record = recordFromJson(value)
  const parsed = VoiceFingerprintSchema.safeParse({
    register: readString(record.register) ?? '',
    sentenceLengthHabit: readNumber(record.sentenceLengthHabit) ?? 0,
    favouredLexicon: stringArrayFromJson(record.favouredLexicon),
    forbiddenLexicon: stringArrayFromJson(record.forbiddenLexicon),
    sampleLines: stringArrayFromJson(record.sampleLines).slice(0, 3),
  })
  if (!parsed.success) return { ...EMPTY_VOICE_FINGERPRINT }
  return parsed.data
}
