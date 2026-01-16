# Security Audit Report

**Date:** January 16, 2026  
**Project:** Tilemap  
**Auditor:** Automated Security Scan + Manual Review

---

## Executive Summary

This report documents security vulnerabilities identified and fixed in the Tilemap application. The audit covered authentication, authorization, input validation, SSRF protection, path traversal prevention, and dependency vulnerabilities.

### Risk Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical | 9 | 9 | 0 |
| High | 12 | 12 | 0 |
| Medium | 8 | 4 | 4* |
| Low | 8 | 0 | 8* |

*Remaining issues are in transitive dependencies (Trigger.dev SDK, drizzle-kit) awaiting upstream fixes.

---

## Critical Fixes Applied

### 1. Authentication Added to 64+ API Routes

**Vulnerability:** Many API routes were publicly accessible without authentication.

**Impact:** Unauthorized access to user data, project manipulation, resource abuse.

**Files Fixed:**
- `/api/storyteller/actions/route.ts`
- `/api/storyteller/consistency/check/route.ts`
- `/api/storyteller/consistency/apply/route.ts`
- `/api/storyteller/consistency/undo/route.ts`
- `/api/storyteller/save-portrait-variant/route.ts`
- `/api/storyteller/save-episode-poster-variant/route.ts`
- `/api/storyteller/bible/lock/route.ts`
- `/api/trigger/token/route.ts`
- `/api/interior-designer/*` (all routes)
- `/api/loop-creator/*` (all routes)
- `/api/entities/*` (all routes)
- `/api/tiles/*` (all routes)
- `/api/trigger-*/*` (all routes)
- And 50+ more...

**Solution:** Added `requireAuth()` or `withAuth()` wrapper to all sensitive endpoints.

---

### 2. SSRF (Server-Side Request Forgery) Protection

**Vulnerability:** External URLs from user input were fetched without validation.

**Impact:** Attackers could probe internal networks, access cloud metadata endpoints (169.254.169.254), or exfiltrate data.

**Files Fixed:**
- `/api/generate-3d/route.ts`
- `/api/proxy-model/route.ts`
- `/api/save-model/route.ts`
- `/api/upscale/midjourney/route.ts`

**Solution:** Created `/lib/security.ts` with:
```typescript
// Whitelist-based URL validation
isAllowedUrl(url: string): { allowed: boolean; reason?: string }

// Safe fetch wrapper with timeout
safeFetch(url: string, options?: RequestInit): Promise<Response>
```

**Blocked:**
- Localhost (127.0.0.1, ::1, 0.0.0.0)
- Private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
- Link-local addresses (169.254.x.x)
- Cloud metadata endpoints
- Non-whitelisted domains

---

### 3. Path Traversal Prevention

**Vulnerability:** User-supplied filenames/paths could escape the allowed directory.

**Impact:** Read/write arbitrary files on the server (e.g., `/etc/passwd`, `.env`).

**Files Fixed:**
- `/api/save-image/route.ts`
- `/api/delete-image/route.ts`
- `/api/save-model/route.ts`
- `/api/generate-3d/route.ts`

**Solution:**
```typescript
// Validates and normalizes paths
sanitizePath(userInput: string, allowedBaseDir: string): {
  safe: boolean;
  sanitizedPath: string | null;
  error?: string;
}

// Sanitizes filenames
sanitizeFilename(filename: string): string | null
```

**Blocked:**
- `../` sequences
- Null bytes (`\0`)
- Absolute paths
- Paths escaping base directory

---

### 4. Security Headers Added

**Vulnerability:** Missing security headers allowed clickjacking, XSS, and content sniffing attacks.

**File Fixed:** `/middleware.ts`

**Headers Added:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: (production only)
```

---

### 5. CSRF Protection Enhanced

**Vulnerability:** State-changing requests could be forged from malicious sites.

**File Fixed:** `/middleware.ts`

**Solution:** Origin/Referer validation for POST, PUT, PATCH, DELETE requests on `/api/*` routes.

---

### 6. Sensitive Data Logging Removed

**Vulnerability:** API keys, tokens, and passwords were being logged.

**Files Fixed:**
- `/hooks/useTriggerRealtime.ts`
- `/api/trigger/token/route.ts`

**Solution:** Created secure logging utilities:
```typescript
// Auto-redacts sensitive fields
redactSensitive(obj: any): any

// Secure logger
secureLog.info/warn/error/debug(message, data)
```

---

### 7. Rate Limiting Added

**Vulnerability:** No protection against brute force or resource exhaustion.

**Solution:** `withRateLimit()` wrapper applied to expensive endpoints:
- 3D generation: 5 req/min
- Image operations: 60 req/min
- AI endpoints: 10-30 req/min

---

### 8. Input Validation Schemas

**Vulnerability:** Insufficient input validation allowed malformed data.

**Solution:** Zod schemas in `/lib/security.ts`:
```typescript
schemas.uuid
schemas.projectId
schemas.email
schemas.url
schemas.filename
schemas.coordinate
schemas.createTile
schemas.imageBase64
```

---

### 9. Next.js Critical Vulnerability Fixed

**Vulnerability:** Next.js 15.0-15.4.6 had 9 CVEs including:
- GHSA-9qr9-h5gf-34mp (RCE in React flight protocol)
- GHSA-f82v-jwr5-mffw (Authorization Bypass in Middleware)
- GHSA-4342-x723-ch2f (SSRF via Middleware Redirect)

**Solution:** Upgraded to Next.js 15.5.9

---

## Remaining Issues (Low Priority)

### Transitive Dependencies

| Package | Severity | Issue | Status |
|---------|----------|-------|--------|
| cookie (via @trigger.dev/sdk) | Low | Out of bounds characters | Awaiting upstream |
| esbuild (via drizzle-kit) | Moderate | Dev server request exposure | Dev-only, low risk |
| undici (via @vercel/blob) | Low | Decompression DoS | Awaiting upstream |

### Configuration Warnings

1. **ESLint/TypeScript errors ignored during build** (`next.config.js`)
   - `eslint.ignoreDuringBuilds: true`
   - `typescript.ignoreBuildErrors: true`
   - **Recommendation:** Fix underlying errors and enable checks

---

## New Security Infrastructure

### `/lib/security.ts`

Centralized security utilities:
- `sanitizePath()` - Path traversal protection
- `sanitizeFilename()` - Filename sanitization
- `isValidProjectId()` - UUID validation
- `isAllowedUrl()` - SSRF protection
- `safeFetch()` - Secure HTTP client
- `redactSensitive()` - Log sanitization
- `secureLog` - Secure logging
- `schemas` - Zod validation schemas
- `securityHeaders` - HTTP security headers

### `/lib/api-utils.ts`

API middleware utilities:
- `withAuth()` - Authentication wrapper
- `withRateLimit()` - Rate limiting wrapper
- `withCsrfProtection()` - CSRF protection
- `verifyProjectAccess()` - RLS-based access control
- `verifyEntityAccess()` - Entity-level access control

---

## Verification Commands

```bash
# Check for remaining vulnerabilities
npm audit

# Test authentication
curl -X POST http://localhost:3000/api/storyteller/actions -d '{}' 
# Expected: 401 Unauthorized

# Test SSRF protection
curl -X GET "http://localhost:3000/api/proxy-model?url=http://169.254.169.254/latest/meta-data/"
# Expected: 403 URL not allowed

# Test path traversal
curl -X POST http://localhost:3000/api/save-image -d '{"projectId":"test","filename":"../../../etc/passwd","imageData":"..."}'
# Expected: 400 Invalid file path
```

---

## Recommendations

1. **Enable ESLint/TypeScript checks** - Fix errors and remove `ignoreDuringBuilds`
2. **Add WAF** - Consider Cloudflare or AWS WAF for production
3. **Implement audit logging** - Track security-relevant events
4. **Add 2FA** - For admin/central users
5. **Regular dependency updates** - Schedule monthly `npm audit fix`
6. **Penetration testing** - Annual third-party security assessment

---

## Conclusion

All critical and high-severity vulnerabilities have been addressed. The application now has:
- ✅ Authentication on all sensitive endpoints
- ✅ SSRF protection with domain whitelist
- ✅ Path traversal prevention
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Secure logging
- ✅ Input validation
- ✅ Up-to-date Next.js (15.5.9)

Remaining low-severity issues are in transitive dependencies and pose minimal risk.
