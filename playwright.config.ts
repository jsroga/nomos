import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

const ENV_LOCAL_PATH = '.env.local'
const E2E_CHAT_MODEL = 'openai:gpt-5.6-luna'
const FEATURE_FLAG_DISABLED = 'false'
const STORYTELLER_CONTROLLER_FLAG = 'FF_STORYTELLER_CONTROLLER'

// Load local env so E2E tests can reach Supabase and providers.
dotenv.config({ path: ENV_LOCAL_PATH })

// E2E chat should be fast/cheap; the user can override via STORYTELLER_CHAT_MODEL.
process.env.STORYTELLER_CHAT_MODEL = process.env.STORYTELLER_CHAT_MODEL?.trim() || E2E_CHAT_MODEL
// Hide the CWV debug HUD so it does not intercept pointer events during tests.
process.env.NEXT_PUBLIC_FF_CWV_HUD = FEATURE_FLAG_DISABLED
// Disable the plan-first controller so chat tool calls execute directly.
process.env[STORYTELLER_CONTROLLER_FLAG] = process.env[STORYTELLER_CONTROLLER_FLAG]?.trim() || FEATURE_FLAG_DISABLED

// Reporter ids / output path (Track A3 admin Tests dashboard reads the JSON).
const REPORTER_HTML = 'html'
const REPORTER_JSON = 'json'
const REPORTER_LIST = 'list'
const JSON_OUTPUT_FILE = 'test-results/results.json'
const HTML_OUTPUT_FOLDER = 'playwright-report'

const TRACE_MODE = 'on-first-retry'
const SCREENSHOT_MODE = 'only-on-failure'
const VIDEO_MODE = 'retain-on-failure'
const PROJECT_CHROMIUM = 'chromium'
const DEVICE_DESKTOP_CHROME = 'Desktop Chrome'
const DEV_SERVER_PORT = 3001
const LOCAL_BASE_URL = `http://localhost:${DEV_SERVER_PORT}`
const BUILD_COMMAND = 'npx next build'
const START_COMMAND = `DATABASE_SSL_REJECT_UNAUTHORIZED=false NODE_OPTIONS=--max-old-space-size=8192 npm run start -- -p ${DEV_SERVER_PORT}`
const DEV_SERVER_COMMAND = `${BUILD_COMMAND} && ${START_COMMAND}`

enum LoopbackHost {
  Localhost = 'localhost',
  Ipv4 = '127.0.0.1',
  Ipv6 = '::1',
}

const LOOPBACK_HOSTS = new Set<string>([
  LoopbackHost.Localhost,
  LoopbackHost.Ipv4,
  LoopbackHost.Ipv6,
])

function isRemotePlaywrightUrl(url: string): boolean {
  try {
    return !LOOPBACK_HOSTS.has(new URL(url).hostname)
  } catch {
    return false
  }
}

const BASE_URL = process.env.BASE_URL?.trim() || LOCAL_BASE_URL
process.env.BASE_URL = BASE_URL
const IS_EXTERNAL_URL = isRemotePlaywrightUrl(BASE_URL)

const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER?.trim()
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD?.trim()
const HTTP_CREDENTIALS =
  BASIC_AUTH_USER && BASIC_AUTH_PASSWORD
    ? { username: BASIC_AUTH_USER, password: BASIC_AUTH_PASSWORD }
    : undefined

/**
 * Playwright Configuration for Swiss Army Knife E2E Tests
 */
export default defineConfig({
  testDir: './e2e/scenarios',

  // Test timeout
  timeout: 60 * 1000, // 60 seconds per test

  // Expect timeout
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },

  // Run tests in files in parallel
  fullyParallel: false, // Sequential for now due to shared state
  workers: 1,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Reporter — HTML for humans, JSON for the admin Tests dashboard (Track A3).
  reporter: [
    [REPORTER_HTML, { outputFolder: HTML_OUTPUT_FOLDER }],
    [REPORTER_JSON, { outputFile: JSON_OUTPUT_FILE }],
    [REPORTER_LIST],
  ],

  // Shared settings for all projects
  use: {
    // Base URL — local production build on 3001, or an external preview URL.
    baseURL: BASE_URL,

    // Collect trace when retrying the failed test
    trace: TRACE_MODE,

    // Screenshot on failure
    screenshot: SCREENSHOT_MODE,

    // Video on failure
    video: VIDEO_MODE,

    ...(HTTP_CREDENTIALS ? { httpCredentials: HTTP_CREDENTIALS } : {}),
  },

  // Configure projects for major browsers
  projects: [
    {
      name: PROJECT_CHROMIUM,
      use: { ...devices[DEVICE_DESKTOP_CHROME] },
    },

    // Uncomment for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Build once, then run the production app before starting the tests.
  // Skipped when BASE_URL points to an external deployment (e.g. Vercel preview).
  webServer: IS_EXTERNAL_URL
    ? undefined
    : {
        command: DEV_SERVER_COMMAND,
        url: BASE_URL,
        reuseExistingServer: true, // Reuse a production server already on port 3001
        timeout: 600 * 1000, // 10 minutes for build + server start
      },
})
