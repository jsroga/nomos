/**
 * Admin Tests API (Track A3) — reads the latest Playwright JSON report
 * (test-results/results.json, written by the json reporter) and returns a flat
 * summary for the dashboard. Admin-gated; read-only (no run trigger yet).
 *
 *   GET → { available, summary }   (admin only)
 */

import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { requireAuth } from '@/shared/auth/auth'
import { isAdminUser } from '@/shared/auth/admin-users'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { parsePlaywrightReport } from '@/shared/admin/core/parse-playwright-report'

const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403
const ERR_ADMIN_ONLY = 'Admin access required'
const REPORT_PATH = 'test-results/results.json'
const FILE_ENCODING = 'utf8'

export async function GET() {
  const { session } = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HTTP_UNAUTHORIZED })
  }
  if (!isAdminUser(session.user.email)) {
    return NextResponse.json({ error: ERR_ADMIN_ONLY }, { status: HTTP_FORBIDDEN })
  }

  try {
    const file = await readFile(path.join(process.cwd(), REPORT_PATH), FILE_ENCODING)
    const summary = parsePlaywrightReport(JSON.parse(file))
    return NextResponse.json({ available: true, summary })
  } catch {
    // No report yet (tests never run in this environment) — not an error.
    return NextResponse.json({ available: false, summary: null })
  }
}
