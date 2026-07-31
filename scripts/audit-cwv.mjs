#!/usr/bin/env node
/**
 * Lab Core Web Vitals audit for the marketing landing page.
 * Prefer a production server (`npm run build && npm start`) for representative scores.
 *
 * Usage:
 *   npm run audit:cwv
 *   npm run audit:cwv -- --url http://localhost:3000 --form-factor mobile
 *   npm run audit:cwv -- --url http://localhost:3100 --form-factor desktop
 */
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function readArg(flag, fallback) {
  const idx = process.argv.indexOf(flag)
  if (idx === -1 || !process.argv[idx + 1]) return fallback
  return process.argv[idx + 1]
}

const url = readArg('--url', process.env.CWV_AUDIT_URL ?? 'http://localhost:3000/')
const formFactor = readArg('--form-factor', 'mobile')
const outDir = join(root, '.local/tmp/cwv-audit')
mkdirSync(outDir, { recursive: true })

const chrome = await launch({
  chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
})

try {
  const isDesktop = formFactor === 'desktop'
  const result = await lighthouse(
    url,
    {
      port: chrome.port,
      output: ['json', 'html'],
      onlyCategories: ['performance'],
      // Mobile keeps LH defaults (slow 4G + 4× CPU). Desktop must use the
      // desktop config — otherwise simulate still applies mobile throttling.
      ...(isDesktop
        ? {}
        : {
            formFactor: 'mobile',
            throttlingMethod: 'simulate',
          }),
    },
    isDesktop ? desktopConfig : undefined
  )

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const base = join(outDir, `landing-${formFactor}-${stamp}`)
  const { writeFileSync } = await import('node:fs')
  writeFileSync(`${base}.json`, result.report[0])
  writeFileSync(`${base}.html`, result.report[1])

  const audits = result.lhr.audits
  const categories = result.lhr.categories
  const score = Math.round((categories.performance?.score ?? 0) * 100)

  const pick = id => {
    const a = audits[id]
    if (!a) return null
    return {
      id,
      title: a.title,
      displayValue: a.displayValue ?? null,
      numericValue: a.numericValue ?? null,
      score: a.score,
    }
  }

  const summary = {
    url,
    formFactor,
    performanceScore: score,
    fetchTime: result.lhr.fetchTime,
    metrics: {
      lcp: pick('largest-contentful-paint'),
      cls: pick('cumulative-layout-shift'),
      tbt: pick('total-blocking-time'),
      fcp: pick('first-contentful-paint'),
      si: pick('speed-index'),
      tti: pick('interactive'),
      inpProxy: pick('interaction-to-next-paint'),
    },
    opportunities: Object.values(audits)
      .filter(a => a.details?.type === 'opportunity' && (a.score === null || a.score < 0.9))
      .map(a => ({
        id: a.id,
        title: a.title,
        displayValue: a.displayValue ?? null,
        score: a.score,
      }))
      .slice(0, 12),
    diagnostics: [
      'unused-javascript',
      'bootup-time',
      'mainthread-work-breakdown',
      'dom-size',
      'third-party-summary',
      'total-byte-weight',
      'uses-long-cache-ttl',
      'render-blocking-resources',
    ]
      .map(pick)
      .filter(Boolean),
    reports: {
      json: `${base}.json`,
      html: `${base}.html`,
    },
  }

  writeFileSync(join(outDir, 'latest-summary.json'), JSON.stringify(summary, null, 2))
  console.log(JSON.stringify(summary, null, 2))
} finally {
  await chrome.kill()
}
