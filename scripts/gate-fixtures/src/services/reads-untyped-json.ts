/**
 * Gate fixture — MUST fail `local/no-untyped-json-read`.
 *
 * A disabled gate looks exactly like a passing gate, so every structural rule
 * ships with a file that proves it is switched on. Asserted by
 * scripts/__tests__/gate-fixtures.test.ts. Never imported by src/.
 */
import { readString, recordFromJson } from '@/shared/data/json-guards'

export function readAssetName(asset: unknown): string {
  // Expected error: local/no-untyped-json-read
  const row = recordFromJson(asset)
  // Expected error: local/no-untyped-json-read
  return readString(row.image_filename) ?? ''
}
