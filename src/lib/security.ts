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
import { z } from 'zod'

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
  allowedBaseDir: string = 'projects'
): { safe: boolean; sanitizedPath: string | null; error?: string } {
  if (!userInput || typeof userInput !== 'string') {
    return { safe: false, sanitizedPath: null, error: 'Invalid input' }
  }

  // Remove null bytes (can bypass some path checks)
  const cleaned = userInput.replace(/\0/g, '')

  // Check for obvious traversal attempts
  if (cleaned.includes('..') || cleaned.includes('\0')) {
    return { safe: false, sanitizedPath: null, error: 'Path traversal detected' }
  }

  // Normalize the path to resolve any . or redundant separators
  const normalized = path.normalize(cleaned)

  // After normalization, check again for traversal
  if (normalized.includes('..') || normalized.startsWith('/') || normalized.startsWith('\\')) {
    return { safe: false, sanitizedPath: null, error: 'Path traversal detected after normalization' }
  }

  // Build the full path and verify it's within the allowed directory
  const baseDir = path.join(process.cwd(), 'public', allowedBaseDir)
  const fullPath = path.join(baseDir, normalized)

  // Ensure the resolved path is within the allowed base directory
  if (!fullPath.startsWith(baseDir)) {
    return { safe: false, sanitizedPath: null, error: 'Path escapes allowed directory' }
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
  if (safeFilename.startsWith('.') || safeFilename.includes('..')) {
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
 * Allowed domains for external fetches
 * Add domains that your application legitimately needs to access
 */
const ALLOWED_EXTERNAL_DOMAINS = [
  // 3D Model APIs
  'api.meshy.ai',
  'assets.meshy.ai',
  'cdn.meshy.ai',
  'api.hyper3d.ai',
  // AI APIs
  'api.openai.com',
  'generativelanguage.googleapis.com',
  'api.stability.ai',
  'api.replicate.com',
  'api.cometapi.com', // Midjourney proxy
  'fal.run',
  'queue.fal.run',
  // Storage
  'storage.googleapis.com',
  'supabase.co',
  // Vercel Blob
  'blob.vercel-storage.com',
  'public.blob.vercel-storage.com',
] as const

/**
 * Check if a URL is safe to fetch (SSRF protection)
 */
export function isAllowedUrl(url: string): { allowed: boolean; reason?: string } {
  try {
    const parsed = new URL(url)

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { allowed: false, reason: 'Invalid protocol - only HTTP/HTTPS allowed' }
    }

    // Block local/private IPs
    const hostname = parsed.hostname.toLowerCase()

    // Block localhost
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0'
    ) {
      return { allowed: false, reason: 'Localhost access blocked' }
    }

    // Block private IP ranges
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
    if (ipv4Pattern.test(hostname)) {
      const octets = hostname.split('.').map(Number)
      // 10.x.x.x
      if (octets[0] === 10) {
        return { allowed: false, reason: 'Private IP range blocked' }
      }
      // 172.16.x.x - 172.31.x.x
      if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
        return { allowed: false, reason: 'Private IP range blocked' }
      }
      // 192.168.x.x
      if (octets[0] === 192 && octets[1] === 168) {
        return { allowed: false, reason: 'Private IP range blocked' }
      }
      // 169.254.x.x (link-local)
      if (octets[0] === 169 && octets[1] === 254) {
        return { allowed: false, reason: 'Link-local IP blocked' }
      }
    }

    // Block metadata endpoints (cloud provider SSRF targets)
    if (
      hostname === '169.254.169.254' || // AWS/GCP metadata
      hostname === 'metadata.google.internal' ||
      hostname.endsWith('.internal')
    ) {
      return { allowed: false, reason: 'Cloud metadata endpoint blocked' }
    }

    // Check against whitelist
    const isWhitelisted = ALLOWED_EXTERNAL_DOMAINS.some(
      domain => hostname === domain || hostname.endsWith('.' + domain)
    )

    if (!isWhitelisted) {
      return { allowed: false, reason: `Domain not in allowlist: ${hostname}` }
    }

    return { allowed: true }
  } catch {
    return { allowed: false, reason: 'Invalid URL format' }
  }
}

/**
 * Safe fetch wrapper with SSRF protection
 */
export async function safeFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const check = isAllowedUrl(url)
  if (!check.allowed) {
    throw new Error(`SSRF Protection: ${check.reason}`)
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

export const schemas = {
  uuid: z.string().uuid(),
  projectId: z.string().uuid(),
  email: z.string().email(),
  url: z.string().url(),
  filename: z.string().min(1).max(255).regex(/^[a-zA-Z0-9._-]+$/),
  
  // Coordinate validation
  coordinate: z.number().int().min(-1000).max(1000),
  
  // Common API payloads
  createTile: z.object({
    projectId: z.string().uuid(),
    x: z.number().int().min(-1000).max(1000),
    y: z.number().int().min(-1000).max(1000),
    prompt: z.string().min(1).max(5000),
  }),
  
  imageBase64: z.string().regex(/^data:image\/(png|jpeg|jpg|webp|gif);base64,/),
}

// ============================================
// SECURE LOGGING
// ============================================

const SENSITIVE_KEYS = [
  'password',
  'apiKey',
  'api_key',
  'apikey',
  'secret',
  'token',
  'authorization',
  'auth',
  'credential',
  'private',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'sessionToken',
  'session_token',
  'jwt',
  'bearer',
]

/**
 * Redact sensitive data from objects before logging
 */
export function redactSensitive(obj: any, depth = 0): any {
  if (depth > 10) return '[MAX_DEPTH]' // Prevent infinite recursion
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitive(item, depth + 1))
  }

  const redacted: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
      redacted[key] = '[REDACTED]'
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
  info: (message: string, data?: any) => {
    console.log(message, data ? redactSensitive(data) : '')
  },
  warn: (message: string, data?: any) => {
    console.warn(message, data ? redactSensitive(data) : '')
  },
  error: (message: string, data?: any) => {
    console.error(message, data ? redactSensitive(data) : '')
  },
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(message, data ? redactSensitive(data) : '')
    }
  },
}

// ============================================
// SECURITY HEADERS
// ============================================

export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

/**
 * Apply security headers to a response
 */
export function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(securityHeaders)) {
    headers.set(key, value)
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

