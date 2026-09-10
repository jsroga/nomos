import { EntityRegistryNote } from '@/domains/storyteller/services/constants/entity-registry-log'

export function entityNeedsDescription(
  description: string | null | undefined,
  name?: string
): boolean {
  if (!description) return true
  const trimmed = description.trim()
  if (trimmed === '') return true
  if (trimmed.startsWith(EntityRegistryNote.AutoRegistered)) return true
  if (name && trimmed.toLowerCase() === name.trim().toLowerCase()) return true
  return false
}
