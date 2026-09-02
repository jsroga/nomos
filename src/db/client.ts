/**
 * @deprecated Import `db` from `@/shared/persistence` instead.
 *
 * The Drizzle client moved so that database access has one home and the SDK
 * can be fenced to it. Kept as a re-export for one release; the importer count
 * is tracked by `directDbClientImporters` in `.quality-ratchet.json`.
 *
 * See docs/DECISIONS.md ADR 0001.
 */
export { db } from '@/shared/persistence/client'
