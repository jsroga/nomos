/**
 * Moved Utilities Function Tests
 *
 * Verifies that utilities moved to shared/ still function correctly.
 * These are behavior-focused tests for the core utilities.
 */

import { describe, it, expect } from 'vitest'
import { getErrorMessage, toError } from '@/shared/errors/error-utils'
import { cn } from '@/shared/data/utils'
import { sanitizePath, sanitizeFilename, isValidProjectId } from '@/shared/auth/security'

describe('error-utils', () => {
  describe('getErrorMessage', () => {
    it('extracts message from Error instance', () => {
      const error = new Error('Something went wrong')
      expect(getErrorMessage(error)).toBe('Something went wrong')
    })

    it('returns string error as-is', () => {
      expect(getErrorMessage('Error text')).toBe('Error text')
    })

    it('extracts message from error-like object', () => {
      const errorObj = { message: 'Custom error' }
      expect(getErrorMessage(errorObj)).toBe('Custom error')
    })

    it('converts other values to string', () => {
      expect(getErrorMessage(null)).toBe('null')
      expect(getErrorMessage(undefined)).toBe('undefined')
      expect(getErrorMessage(42)).toBe('42')
    })
  })

  describe('toError', () => {
    it('returns Error instance unchanged', () => {
      const error = new Error('Test')
      expect(toError(error)).toBe(error)
    })

    it('wraps string in Error', () => {
      const error = toError('Failed')
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('Failed')
    })

    it('wraps non-Error objects', () => {
      const error = toError({ message: 'Custom' })
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('Custom')
    })
  })
})

describe('utils', () => {
  describe('cn (className merger)', () => {
    it('merges multiple class names', () => {
      const result = cn('bg-red-500', 'text-white', 'p-4')
      expect(result).toContain('bg-red-500')
      expect(result).toContain('text-white')
      expect(result).toContain('p-4')
    })

    it('handles conditional classes', () => {
      const result = cn('base', false && 'hidden', true && 'block')
      expect(result).toContain('base')
      expect(result).toContain('block')
      expect(result).not.toContain('hidden')
    })

    it('deduplicates conflicting Tailwind classes', () => {
      // cn uses twMerge which handles Tailwind conflicts
      const result = cn('p-4', 'p-8')
      expect(result).toBe('p-8')
    })
  })
})

describe('security utils', () => {
  describe('sanitizePath', () => {
    it('accepts safe relative path', () => {
      const result = sanitizePath('subfolder/file.txt', 'projects')
      expect(result.safe).toBe(true)
      expect(result.sanitizedPath).toBeTruthy()
    })

    it('rejects path traversal with ..', () => {
      const result = sanitizePath('../../../etc/passwd', 'projects')
      expect(result.safe).toBe(false)
      expect(result.error).toContain('traversal')
    })

    it('rejects absolute paths', () => {
      const result = sanitizePath('/etc/passwd', 'projects')
      expect(result.safe).toBe(false)
    })

    it('strips null bytes and processes the cleaned path', () => {
      // null bytes are removed first (line 33), then the cleaned path is validated
      const result = sanitizePath('file\0.txt', 'projects')
      // Since null bytes are removed, 'file.txt' is what gets validated
      expect(result.safe).toBe(true)
      expect(result.sanitizedPath).toBeTruthy()
    })

    it('rejects invalid input types', () => {
      const result = sanitizePath('', 'projects')
      expect(result.safe).toBe(false)
      expect(result.error).toContain('Invalid input')
    })
  })

  describe('sanitizeFilename', () => {
    it('allows safe alphanumeric filename', () => {
      const result = sanitizeFilename('report-2024.pdf')
      expect(result).toBe('report-2024.pdf')
    })

    it('removes path separators completely', () => {
      // Line 79: replace(/[/\\:*?"<>|\0]/g, '') removes separators entirely
      const result = sanitizeFilename('folder/file.txt')
      expect(result).toBe('folderfile.txt')
    })

    it('removes dangerous characters completely', () => {
      // Line 79: replace(/[/\\:*?"<>|\0]/g, '') removes dangerous chars
      const result = sanitizeFilename('file<>:|?.txt')
      expect(result).toBe('file.txt')
    })

    it('rejects hidden files starting with dot', () => {
      const result = sanitizeFilename('.htaccess')
      expect(result).toBe(null)
    })

    it('rejects double dot sequences', () => {
      const result = sanitizeFilename('file..txt')
      expect(result).toBe(null)
    })

    it('rejects empty or too-long filenames', () => {
      expect(sanitizeFilename('')).toBe(null)
      expect(sanitizeFilename('a'.repeat(256))).toBe(null)
    })

    it('rejects invalid input types', () => {
      expect(sanitizeFilename(null as any)).toBe(null)
    })
  })

  describe('isValidProjectId', () => {
    it('accepts valid UUIDs', () => {
      expect(isValidProjectId('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
      expect(isValidProjectId('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
    })

    it('rejects invalid formats', () => {
      expect(isValidProjectId('not-a-uuid')).toBe(false)
      expect(isValidProjectId('12345')).toBe(false)
      expect(isValidProjectId('')).toBe(false)
    })

    it('rejects UUIDs with wrong separator or length', () => {
      expect(isValidProjectId('550e8400-e29b-41d4-a716-44665544000')).toBe(false) // too short
      expect(isValidProjectId('550e8400_e29b_41d4_a716_446655440000')).toBe(false) // wrong separator
    })
  })
})
