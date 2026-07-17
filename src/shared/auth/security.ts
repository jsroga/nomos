/**
 * Security Utilities
 *
 * Critical security functions for:
 * - Path traversal prevention
 * - SSRF protection
 * - Input sanitization
 * - Secure logging
 */

import path from 'path'
import {
  ALLOWED_EXTERNAL_DOMAINS,
  FsDirectory,
  NodeEnv,
  PathTraversalToken,
  SecureLogRedaction,
  SecurityValidationMessage,
  SENSITIVE_LOG_KEYS,
  SsrfBlockReason,
  SsrfErrorPrefix,
} from '@/shared/auth/constants/security'
import {
  isAllowedProtocol,
  isCloudMetadataHostname,
  isLocalHostname,
  privateIpv4BlockReason,
} from '@/shared/auth/ssrf-host-checks'

// ============================================
// PATH TRAVERSAL PROTECTION
// ============================================

/**
 * Validate and sanitize a file path to prevent directory traversal attacks
 * @param userInput - The user-provided path/filename
 * @param allowedBaseDir - The allowed base directory (e.g., 'projects')
 * @returns Sanitized path or null if invalid
 */
export function sanitizePath(
  userInput: string,
  allowedBaseDir: string = FsDirectory.Projects
): { safe: boolean; sanitizedPath: string | null; error?: string } {
  if (!userInput || typeof userInput !== 'string') {
    return { safe: false, sanitizedPath: null, error: SecurityValidationMessage.InvalidInput }
  }

  // Remove null bytes (can bypass some path checks)
  const cleaned = userInput.replace(/\0/g, '')

  // Check for obvious traversal attempts
  if (cleaned.includes(PathTraversalToken.Parent) || cleaned.includes('\0')) {
    return {
      safe: false,
      sanitizedPath: null,
      error: SecurityValidationMessage.PathTraversalDetected,
    }
  }

  // Normalize the path to resolve any . or redundant separators
  const normalized = path.normalize(cleaned)

  // After normalization, check again for traversal
  if (
    normalized.includes(PathTraversalToken.Parent) ||
    normalized.startsWith('/') ||
    normalized.startsWith('\\')
  ) {
    return {
      safe: false,
      sanitizedPath: null,
      error: SecurityValidationMessage.PathTraversalAfterNormalization,
    }
  }

  // Build the full path and verify it's within the allowed directory
  const baseDir = path.join(process.cwd(), FsDirectory.Public, allowedBaseDir)
  const fullPath = path.join(baseDir, normalized)

  // Ensure the resolved path is within the allowed base directory
  if (!fullPath.startsWith(baseDir)) {
    return {
      safe: false,
      sanitizedPath: null,
      error: SecurityValidationMessage.PathEscapesAllowedDirectory,
    }
  }

  return { safe: true, sanitizedPath: fullPath }
}

/**
 * Validate a project ID format (UUID)
 */
export function isValidProjectId(projectId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(projectId)
}

/**
 * Sanitize filename - only allow alphanumeric, dash, underscore, dot
 */
export function sanitizeFilename(filename: string): string | null {
  if (!filename || typeof filename !== 'string') return null

  // Remove path separators and null bytes
  const cleaned = filename.replace(/[/\\:*?"<>|\0]/g, '')

  // Only allow safe characters
  const safeFilename = cleaned.replace(/[^a-zA-Z0-9._-]/g, '_')

  // Prevent hidden files and double extensions that could be exploits
  if (safeFilename.startsWith('.') || safeFilename.includes(PathTraversalToken.Parent)) {
    return null
  }

  // Limit length
  if (safeFilename.length > 255 || safeFilename.length === 0) {
    return null
  }

  return safeFilename
}

// ============================================
// SSRF PROTECTION
// ============================================

/**
 * Check if a URL is safe to fetch (SSRF protection)
 */
export function isAllowedUrl(url: string): { allowed: boolean; reason?: string } {
  try {
    const parsed = new URL(url)

    if (!isAllowedProtocol(parsed.protocol)) {
      return { allowed: false, reason: SsrfBlockReason.InvalidProtocol }
    }

    const hostname = parsed.hostname.toLowerCase()

    if (isLocalHostname(hostname)) {
      return { allowed: false, reason: SsrfBlockReason.LocalhostBlocked }
    }

    const privateBlock = privateIpv4BlockReason(hostname)
    if (privateBlock) {
      return { allowed: false, reason: privateBlock }
    }

    if (isCloudMetadataHostname(hostname)) {
      return { allowed: false, reason: SsrfBlockReason.CloudMetadataBlocked }
    }

    const isWhitelisted = ALLOWED_EXTERNAL_DOMAINS.some(
      domain => hostname === domain || hostname.endsWith('.' + domain)
    )

    if (!isWhitelisted) {
      return { allowed: false, reason: `Domain not in allowlist: ${hostname}` }
    }

    return { allowed: true }
  } catch {
    return { allowed: false, reason: SsrfBlockReason.InvalidUrlFormat }
  }
}

/**
 * Safe fetch wrapper with SSRF protection
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  const check = isAllowedUrl(url)
  if (!check.allowed) {
    throw new Error(`${SsrfErrorPrefix.Protection}${check.reason}`)
  }

  // Add timeout to prevent slow loris attacks
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

// ============================================
// INPUT VALIDATION SCHEMAS
// ============================================


// ============================================
// SECURE LOGGING
// ============================================

/**
 * Redact sensitive data from objects before logging
 */
export function redactSensitive(obj: unknown, depth = 0): unknown {
  if (depth > 10) return SecureLogRedaction.MaxDepth
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitive(item, depth + 1))
  }

  const redacted: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    if (SENSITIVE_LOG_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
      redacted[key] = SecureLogRedaction.Redacted
    } else if (typeof value === 'object') {
      redacted[key] = redactSensitive(value, depth + 1)
    } else {
      redacted[key] = value
    }
  }

  return redacted
}

/**
 * Secure logger that automatically redacts sensitive data
 */
export const secureLog = {
  info: (message: string, data?: unknown) => {
    console.log(message, data ? redactSensitive(data) : '')
  },
  warn: (message: string, data?: unknown) => {
    console.warn(message, data ? redactSensitive(data) : '')
  },
  error: (message: string, data?: unknown) => {
    console.error(message, data ? redactSensitive(data) : '')
  },
  debug: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === NodeEnv.Development) {
      console.debug(message, data ? redactSensitive(data) : '')
    }
  },
}
