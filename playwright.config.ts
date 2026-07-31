import { defineConfig, devices } from '@playwright/test'

// Reporter ids / output path (Track A3 admin Tests dashboard reads the JSON).
const REPORTER_HTML = 'html'
const REPORTER_JSON = 'json'
const REPORTER_LIST = 'list'
const JSON_OUTPUT_FILE = 'test-results/results.json'
const HTML_OUTPUT_FOLDER = 'playwright-report'

const TRACE_MODE = 'on-first-retry'
const SCREENSHOT_MODE = 'only-on-failure'
const VIDEO_MODE = 'retain-on-failure'
const BYPASS_AUTH_HEADER_VALUE = 'true'
const PROJECT_CHROMIUM = 'chromium'
const DEVICE_DESKTOP_CHROME = 'Desktop Chrome'
const DEV_SERVER_COMMAND = 'npm run dev'

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
    // Base URL
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: TRACE_MODE,

    // Screenshot on failure
    screenshot: SCREENSHOT_MODE,

    // Video on failure
    video: VIDEO_MODE,

    // Bypass auth in development for E2E tests
    extraHTTPHeaders: {
      'x-bypass-auth': BYPASS_AUTH_HEADER_VALUE,
    },
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

  // Run your local dev server before starting the tests
  webServer: {
    command: DEV_SERVER_COMMAND,
    url: 'http://localhost:3000',
    reuseExistingServer: true, // Always reuse if already running
    timeout: 120 * 1000, // 2 minutes to start dev server
  },
})
