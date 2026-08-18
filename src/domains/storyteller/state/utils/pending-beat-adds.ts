import { recordFromJson, readNumber, readString } from '@/shared/data/json-guards'

function beatCreateArgSequence(args: Record<string, unknown>, data: Record<string, unknown>): string {
  const fromArgs = readNumber(args.sequence) ?? readString(args.sequence)
  const fromData = readNumber(data.sequence) ?? readString(data.sequence)
  if (fromArgs !== undefined) return String(fromArgs)
  if (fromData !== undefined) return String(fromData)
  return ''
}

export function beatCreateArgKey(args: Record<string, unknown>): string {
  const data = recordFromJson(args.data)
  return `${readString(data.logline) ?? ''}:${beatCreateArgSequence(args, data)}`
}

export function mergePendingBeatArgs(
  current: readonly Record<string, unknown>[],
  incoming: readonly Record<string, unknown>[],
): Record<string, unknown>[] {
  const seen = new Set(current.map(beatCreateArgKey))
  const next = [...current]
  for (const args of incoming) {
    const key = beatCreateArgKey(args)
    if (seen.has(key)) continue
    seen.add(key)
    next.push(args)
  }
  return next
}
