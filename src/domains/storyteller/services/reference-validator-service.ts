import type { ProjectScope } from '@/shared/auth/project-scope'
import { entityRegistry } from './entity-registry-service'
import { parseReferences } from '@/domains/storyteller/core/entities/reference-parser'
import { descriptionForNewReference } from '@/domains/storyteller/services/entity-base-description-service'

const REFERENCE_CONTEXT_WINDOW = 300

function surroundingTextForRef(
  text: string,
  startIndex: number,
  endIndex: number
): string {
  const from = Math.max(0, startIndex - REFERENCE_CONTEXT_WINDOW)
  const to = Math.min(text.length, endIndex + REFERENCE_CONTEXT_WINDOW)
  return text.slice(from, to)
}

/**
 * Validates references in the text.
 * Auto-resolves valid references, registers missing ones if name is new, and removes completely broken ones.
 */
export async function validateReferences(text: string, scope: ProjectScope): Promise<string> {
  if (!text || typeof text !== 'string') return text

  const refs = parseReferences(text)
  if (refs.length === 0) return text

  let updatedText = text
  // Sort descending by startIndex to replace from end to beginning to avoid index shifting issues
  const sortedRefs = [...refs].sort((a, b) => b.startIndex - a.startIndex)

  for (const ref of sortedRefs) {
    if (!ref.type) {
      // Remove completely incoherent references
      updatedText =
        updatedText.substring(0, ref.startIndex) +
        ref.displayName +
        updatedText.substring(ref.endIndex)
      continue
    }

    const existingValid = await entityRegistry.resolve(ref.refId)
    if (existingValid) {
      continue // Exists and is valid
    }

    // Check if it exists by name and type instead
    const existingByName = await entityRegistry.findByNameAndType(scope, ref.displayName, ref.type)

    let newRefId = ref.refId

    if (existingByName) {
      // Auto-replace with the correct ID
      newRefId = existingByName.id
    } else {
      const description = await descriptionForNewReference('', {
        name: ref.displayName,
        type: ref.type,
        surroundingText: surroundingTextForRef(text, ref.startIndex, ref.endIndex),
        scope,
      })
      newRefId = await entityRegistry.register({
        type: ref.type,
        name: ref.displayName,
        description,
        scope,
      })
    }

    // Replace the old reference string with the new valid one in the text
    updatedText =
      updatedText.substring(0, ref.startIndex) +
      `[${ref.displayName}][${newRefId}]` +
      updatedText.substring(ref.endIndex)
  }

  return updatedText
}

/**
 * Deep validates all string fields in an object that might contain references.
 * Recursively traverses objects and arrays.
 */
export async function validateReferencesInObject(obj: unknown, scope: ProjectScope): Promise<unknown> {
  if (!obj) return obj

  if (typeof obj === 'string') {
    return await validateReferences(obj, scope)
  }

  if (Array.isArray(obj)) {
    return Promise.all(obj.map(item => validateReferencesInObject(item, scope)))
  }

  if (typeof obj === 'object') {
    const validatedObj: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      validatedObj[key] = await validateReferencesInObject(value, scope)
    }
    return validatedObj
  }

  return obj
}
