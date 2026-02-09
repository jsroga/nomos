/**
 * Schema Validation Tests
 *
 * Ensures all Zod schemas used for structured output are compatible
 * with OpenAI's response_format requirements.
 *
 * OpenAI structured output requirements:
 * - Arrays MUST have defined item schemas (no z.any())
 * - Objects MUST have defined property schemas
 * - No z.unknown(), z.any(), z.void() in schema
 * - All fields must be serializable to JSON Schema
 *
 * These tests prevent runtime errors like:
 * "Invalid schema for response_format: array schema missing items"
 */

import { describe, it, expect } from 'vitest'
import {
  z,
  ZodType,
  ZodArray,
  ZodObject,
  ZodOptional,
  ZodNullable,
  ZodUnion,
  ZodAny,
  ZodUnknown,
} from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

// Import all schemas used for structured output
import {
  EpisodePremiseSchema,
  PremiseArchitectResponseSchema,
  PremiseActionSchema,
} from '../premise-architect-agent'
import {
  ConsistencyAgentResponseSchema,
  InconsistencySchema,
  ConsistencyFixSchema,
} from '../consistency-agent'
import { getErrorMessage } from '@/lib/error-utils'

/**
 * Recursively check if a Zod schema contains z.any() or z.unknown()
 * These are NOT compatible with OpenAI structured output
 */
function containsAnyOrUnknown(schema: ZodType<any>): { hasIssue: boolean; path: string[] } {
  const checkSchema = (
    s: ZodType<any>,
    path: string[] = []
  ): { hasIssue: boolean; path: string[] } => {
    // Check for z.any() or z.unknown()
    if (s instanceof ZodAny || s instanceof ZodUnknown) {
      return { hasIssue: true, path }
    }

    // Unwrap optional/nullable
    if (s instanceof ZodOptional || s instanceof ZodNullable) {
      return checkSchema((s as any)._def.innerType, path)
    }

    // Check array items
    if (s instanceof ZodArray) {
      const itemType = (s as any)._def.type
      if (itemType instanceof ZodAny || itemType instanceof ZodUnknown) {
        return { hasIssue: true, path: [...path, 'items'] }
      }
      return checkSchema(itemType, [...path, 'items'])
    }

    // Check object properties
    if (s instanceof ZodObject) {
      const shape = (s as any)._def.shape()
      for (const [key, value] of Object.entries(shape)) {
        const result = checkSchema(value as ZodType<any>, [...path, key])
        if (result.hasIssue) {
          return result
        }
      }
    }

    // Check union variants
    if (s instanceof ZodUnion) {
      const options = (s as any)._def.options
      for (let i = 0; i < options.length; i++) {
        const result = checkSchema(options[i], [...path, `union[${i}]`])
        if (result.hasIssue) {
          return result
        }
      }
    }

    return { hasIssue: false, path: [] }
  }

  return checkSchema(schema)
}

/**
 * Validate that a schema can be converted to valid JSON Schema
 * This catches issues that would fail at OpenAI API level
 */
function canConvertToJsonSchema(schema: ZodType<any>): { valid: boolean; error?: string } {
  try {
    const jsonSchema = zodToJsonSchema(schema)

    // Check that JSON schema doesn't have empty array items
    const checkJsonSchema = (obj: any, path: string = ''): string | null => {
      if (typeof obj !== 'object' || obj === null) return null

      // Check for arrays without items definition
      if (obj.type === 'array' && !obj.items) {
        return `Array at ${path || 'root'} missing items definition`
      }

      // Check for anyOf/oneOf with empty schemas
      if (obj.anyOf) {
        for (let i = 0; i < obj.anyOf.length; i++) {
          if (Object.keys(obj.anyOf[i]).length === 0) {
            return `Empty anyOf variant at ${path}.anyOf[${i}]`
          }
          const nested = checkJsonSchema(obj.anyOf[i], `${path}.anyOf[${i}]`)
          if (nested) return nested
        }
      }

      // Recursively check properties
      if (obj.properties) {
        for (const [key, value] of Object.entries(obj.properties)) {
          const nested = checkJsonSchema(value, `${path}.${key}`)
          if (nested) return nested
        }
      }

      // Check items
      if (obj.items) {
        const nested = checkJsonSchema(obj.items, `${path}.items`)
        if (nested) return nested
      }

      return null
    }

    const issue = checkJsonSchema(jsonSchema)
    if (issue) {
      return { valid: false, error: issue }
    }

    return { valid: true }
  } catch (error: unknown) {
    return { valid: false, error: getErrorMessage(error) }
  }
}

describe('Schema OpenAI Compatibility', () => {
  describe('No z.any() or z.unknown() in schemas', () => {
    const schemas = [
      { name: 'EpisodePremiseSchema', schema: EpisodePremiseSchema },
      { name: 'PremiseArchitectResponseSchema', schema: PremiseArchitectResponseSchema },
      { name: 'PremiseActionSchema', schema: PremiseActionSchema },
      { name: 'ConsistencyAgentResponseSchema', schema: ConsistencyAgentResponseSchema },
      { name: 'InconsistencySchema', schema: InconsistencySchema },
      { name: 'ConsistencyFixSchema', schema: ConsistencyFixSchema },
    ]

    schemas.forEach(({ name, schema }) => {
      it(`${name} should not contain z.any() or z.unknown()`, () => {
        const result = containsAnyOrUnknown(schema)
        if (result.hasIssue) {
          throw new Error(
            `Schema ${name} contains z.any()/z.unknown() at path: ${result.path.join('.')}`
          )
        }
        expect(result.hasIssue).toBe(false)
      })
    })
  })

  describe('JSON Schema conversion', () => {
    const schemas = [
      { name: 'EpisodePremiseSchema', schema: EpisodePremiseSchema },
      { name: 'PremiseArchitectResponseSchema', schema: PremiseArchitectResponseSchema },
      { name: 'ConsistencyAgentResponseSchema', schema: ConsistencyAgentResponseSchema },
    ]

    schemas.forEach(({ name, schema }) => {
      it(`${name} should convert to valid JSON Schema`, () => {
        const result = canConvertToJsonSchema(schema)
        if (!result.valid) {
          throw new Error(`Schema ${name} failed JSON Schema conversion: ${result.error}`)
        }
        expect(result.valid).toBe(true)
      })
    })
  })

  describe('Schema validation', () => {
    it('EpisodePremiseSchema should validate correct data', () => {
      const validData = {
        title: 'Test',
        logline: 'Test logline',
        theHook: 'Hook',
        theTurn: 'Turn',
        theAftermath: 'Aftermath',
        protagonistHook: 'Protagonist hook',
        fatalFlaw: 'Fatal flaw',
        stakes: 'Stakes',
        transformation: 'Transformation',
        inevitableConsequence: 'Consequence',
        thematicFocus: 'Theme',
        charactersInvolved: ['Char A', 'Char B'],
      }

      const result = EpisodePremiseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('PremiseArchitectResponseSchema should validate with actions', () => {
      const validData = {
        message: 'This works because...',
        episodePremise: {
          title: 'Test',
          logline: 'Test',
          theHook: 'Hook',
          theTurn: 'Turn',
          theAftermath: 'Aftermath',
          protagonistHook: 'Hook',
          fatalFlaw: 'Flaw',
          stakes: 'Stakes',
          transformation: 'Change',
          inevitableConsequence: 'Consequence',
          thematicFocus: 'Theme',
          charactersInvolved: [],
        },
        actions: [{ type: 'UPDATE_CHARACTER', description: 'Update character arc' }],
        confidence: 0.9,
      }

      const result = PremiseArchitectResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('ConsistencyAgentResponseSchema should validate correct data', () => {
      const validData = {
        inconsistencies: [
          {
            type: 'character',
            severity: 'major',
            description: 'Character inconsistency',
            affectedElements: [{ type: 'character', id: 'char-1', fieldPath: 'psychology.traits' }],
          },
        ],
        fixes: [
          {
            targetElement: { type: 'character', id: 'char-1' },
            changes: [{ path: 'psychology.traits', before: 'old', after: 'new', reason: 'Fix' }],
          },
        ],
      }

      const result = ConsistencyAgentResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })
})

describe('Regression: z.any() array items', () => {
  it('should fail for schema with z.any() array items', () => {
    // This is the pattern that caused the original error
    const badSchema = z.object({
      items: z.array(z.any()),
    })

    const result = containsAnyOrUnknown(badSchema)
    expect(result.hasIssue).toBe(true)
    expect(result.path).toContain('items')
  })

  it('should pass for schema with properly typed array items', () => {
    const goodSchema = z.object({
      items: z.array(
        z.object({
          id: z.string(),
          value: z.number(),
        })
      ),
    })

    const result = containsAnyOrUnknown(goodSchema)
    expect(result.hasIssue).toBe(false)
  })
})
