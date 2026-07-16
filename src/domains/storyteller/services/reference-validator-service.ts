import { entityRegistry } from './entity-registry-service'
import { parseReferences } from '@/domains/storyteller/core/entities/reference-parser'

/**
 * Validates references in the text.
 * Auto-resolves valid references, registers missing ones if name is new, and removes completely broken ones.
 */
export async function validateReferences(text: string, projectId: string): Promise<string> {
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
    const existingByName = await entityRegistry.findByNameAndType(projectId, ref.displayName, ref.type)

    let newRefId = ref.refId

    if (existingByName) {
      // Auto-replace with the correct ID
      newRefId = existingByName.id
    } else {
      // Auto-register it
      newRefId = await entityRegistry.register({
        type: ref.type,
        name: ref.displayName,
        description: '',
        projectId,
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
export async function validateReferencesInObject(obj: unknown, projectId: string): Promise<unknown> {
  if (!obj) return obj

  if (typeof obj === 'string') {
    return await validateReferences(obj, projectId)
  }

  if (Array.isArray(obj)) {
    return Promise.all(obj.map(item => validateReferencesInObject(item, projectId)))
  }

  if (typeof obj === 'object') {
    const validatedObj: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      validatedObj[key] = await validateReferencesInObject(value, projectId)
    }
    return validatedObj
  }

  return obj
}
