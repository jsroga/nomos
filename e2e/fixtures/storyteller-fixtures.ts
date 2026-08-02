import { Page, expect } from '@playwright/test'
import {
  FlowApi,
  FlowCharacter,
  FlowChatRole,
  FlowCookie,
  FlowHttp,
  FlowPrompt,
  FlowSelector,
  FlowSse,
  FlowTest,
  FlowTimeout,
  FlowTool,
  FlowUiLabel,
  FlowRoute,
} from '../constants/storyteller-flow'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const PROJECTS_API = `${BASE_URL}${FlowApi.Projects}`
const CHAT_STREAM_API = `${BASE_URL}${FlowApi.ChatStream}`
const CHAT_INPUT = `${FlowSelector.TextArea}[placeholder="${FlowUiLabel.ComposerPlaceholder}"]`
const CHAT_SEND_TIMEOUT = FlowTimeout.Short
const CHAT_STATUS_TIMEOUT = FlowTimeout.Short
const CHAT_WARMUP_TIMEOUT = FlowTimeout.Long
const REPLY_PATTERN = /\b(hello|hi|hey|help|story|world|ready|assist|today)\b/i

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSseEvent(value: unknown): value is { type: string } {
  return isRecord(value) && typeof value.type === 'string'
}

export interface SseEvent {
  type: string
}

export async function parseSseStream(response: Response): Promise<SseEvent[]> {
  const events: SseEvent[] = []
  const reader = response.body?.getReader()
  if (!reader) return events

  const decoder = new TextDecoder()
  let buffer = ''
  let aborted = false

  const SSE_TIMEOUT = 240_000
  const timeout = setTimeout(() => {
    aborted = true
    reader.cancel()
  }, SSE_TIMEOUT)

  try {
    while (!aborted) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith(FlowSse.DataPrefix)) {
          try {
            const parsed = JSON.parse(line.slice(FlowSse.DataPrefix.length))
            if (isSseEvent(parsed)) events.push(parsed)
          } catch { /* skip invalid JSON */ }
        }
      }
    }
  } finally {
    clearTimeout(timeout)
  }

  return events
}

async function findAuthCookie(page: Page): Promise<{ name: string; value: string }> {
  const cookies = await page.context().cookies()
  const cookie = cookies.find(
    c => c.name.startsWith(FlowCookie.NamePrefix) && c.name.endsWith(FlowCookie.NameSuffix)
  )
  expect(cookie).toBeTruthy()
  return { name: cookie?.name ?? '', value: cookie?.value ?? '' }
}

export async function sendChatStream(page: Page, projectId: string, message: string): Promise<SseEvent[]> {
  const cookie = await findAuthCookie(page)
  const response = await fetch(CHAT_STREAM_API, {
    method: FlowHttp.Post,
    headers: {
      [FlowHttp.ContentType]: 'application/json',
      [FlowHttp.Cookie]: `${cookie.name}=${encodeURIComponent(cookie.value)}`,
    },
    body: JSON.stringify({
      message,
      projectId,
      traceId: `e2e-chat-${Date.now()}`,
    }),
  })

  expect(response.ok).toBeTruthy()
  return parseSseStream(response)
}

export async function sendChatMessage(page: Page, message: string): Promise<void> {
  const input = page.locator(CHAT_INPUT).first()
  await expect(input).toBeVisible()
  await input.click()
  await input.fill(message)
  const send = page.getByRole(FlowSelector.Button, { name: FlowUiLabel.Send }).first()
  await expect(send).toBeEnabled()
  await send.click()
}

export async function waitForAssistantStatus(page: Page): Promise<void> {
  await expect(page.locator(FlowSelector.RunningStatus).first()).toBeVisible({
    timeout: CHAT_STATUS_TIMEOUT,
  })
}

export async function waitForAssistantResponse(page: Page): Promise<string> {
  const assistant = page.locator(FlowSelector.AssistantMessage).first()
  await expect(assistant).toBeVisible({ timeout: CHAT_SEND_TIMEOUT })
  await expect(assistant).toHaveText(REPLY_PATTERN, { timeout: CHAT_SEND_TIMEOUT })
  await expect(page.getByRole(FlowSelector.Button, { name: FlowUiLabel.Send }).first()).toBeVisible({
    timeout: CHAT_SEND_TIMEOUT,
  })
  const text = await assistant.textContent()
  expect(text).toBeTruthy()
  expect(REPLY_PATTERN.test(text ?? '')).toBe(true)
  return text ?? ''
}

/** Hit the chat API once so the serverless function is warm before UI timing. */
export async function warmAssistantChat(page: Page, projectId?: string): Promise<void> {
  const baseUrl = process.env.BASE_URL || BASE_URL
  const cookies = await page.context().cookies()
  const authCookie = cookies.find(
    cookie =>
      cookie.name.startsWith(FlowCookie.NamePrefix) && cookie.name.endsWith(FlowCookie.NameSuffix)
  )
  if (!authCookie) return

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CHAT_WARMUP_TIMEOUT)
  try {
    const response = await fetch(`${baseUrl}/api/assistant/storyteller`, {
      method: FlowHttp.Post,
      headers: {
        [FlowHttp.ContentType]: 'application/json',
        [FlowHttp.Cookie]: `${authCookie.name}=${encodeURIComponent(authCookie.value)}`,
      },
      body: JSON.stringify({
        messages: [{ role: FlowChatRole.User, content: FlowPrompt.Hello, id: `warm-${Date.now()}` }],
        ...(projectId ? { projectId } : {}),
      }),
      signal: controller.signal,
    })
    await response.text()
  } catch {
    // Warmup is best-effort; the timed UI assertion is the real gate.
  } finally {
    clearTimeout(timer)
  }
}

export interface CreatedProject {
  id: string
  name: string
}

export async function createStoryProject(page: Page): Promise<CreatedProject> {
  const name = `${FlowTest.ProjectNamePrefix} ${Date.now()}`
  const response = await page.request.post(PROJECTS_API, {
    data: { name, description: FlowTest.ProjectDescription },
  })

  expect(response.ok(), `Failed to create project: ${await response.text()}`).toBeTruthy()

  const body = await response.json()
  expect(isString(body.id)).toBe(true)

  return { id: body.id, name }
}

export async function gotoStoryteller(page: Page, projectId: string): Promise<void> {
  await page.goto(`/${projectId}/storyteller`, { waitUntil: FlowRoute.DomContentLoaded })
  await expect(page.locator(`${FlowSelector.TextPrefix}${FlowUiLabel.Storyteller}`)).toBeVisible()
  await expect(page.locator(`${FlowSelector.TextPrefix}${FlowUiLabel.LoadingProject}`)).toBeHidden({ timeout: FlowTimeout.Long })
}

export async function waitForToolCall(page: Page, toolName: string): Promise<void> {
  const toolCard = page.locator(FlowSelector.Div)
    .filter({ hasText: `${FlowSelector.ToolPrefix}${toolName}` })
    .first()
  await expect(toolCard).toBeVisible({ timeout: FlowTimeout.Long })
}

export async function waitForUserMessage(page: Page, text: string): Promise<void> {
  const message = page.locator(FlowSelector.UserMessage)
    .filter({ hasText: text })
    .last()
  await expect(message).toBeVisible({ timeout: FlowTimeout.Short })
}

export async function openStorybible(page: Page): Promise<void> {
  const worldLogic = page.locator(`${FlowSelector.TextPrefix}${FlowUiLabel.WorldLogic}`)
  if (await worldLogic.isVisible().catch(() => false)) return

  const button = page.locator(FlowSelector.Button)
    .filter({ hasText: FlowUiLabel.BibleToggle })
    .first()
  await expect(button).toBeVisible()
  await button.click()
  await expect(worldLogic).toBeVisible({ timeout: FlowTimeout.Short })
}

export async function expectWorldBibleHasContent(page: Page): Promise<void> {
  await expect(page.locator(`${FlowSelector.TextPrefix}${FlowUiLabel.WorldLogic}`)).toBeVisible()
  const rules = page.locator(`${FlowSelector.TextPrefix}${FlowUiLabel.NoWorldRules}`).first()
  const twists = page.locator(`${FlowSelector.TextPrefix}${FlowUiLabel.NoPlotTwists}`).first()
  await expect(rules).toBeHidden()
  await expect(twists).toBeHidden()
}

export async function expectFactionsInBible(page: Page): Promise<void> {
  await expect(page.locator(`${FlowSelector.TextPrefix}${FlowUiLabel.Factions}`)).toBeVisible()
  const empty = page.locator(`${FlowSelector.TextPrefix}${FlowUiLabel.NoFactions}`).first()
  await expect(empty).toBeHidden()
}

export async function expectCharacterInSidebar(page: Page, name: string): Promise<void> {
  const sidebar = page.locator(`${FlowSelector.TextPrefix}${FlowUiLabel.Cast}`).first()
  await expect(sidebar).toBeVisible()
  const character = page.locator(`${FlowSelector.TextPrefix}${name}`).first()
  await expect(character).toBeVisible({ timeout: FlowTimeout.Medium })
}

export async function draftFirstEpisode(page: Page): Promise<void> {
  const button = page.locator(FlowSelector.Button)
    .filter({ hasText: FlowUiLabel.DraftFirstEpisode })
    .first()
  await expect(button).toBeVisible({ timeout: FlowTimeout.Short })
  await button.click()
  await expect(page.locator(`${FlowSelector.TextPrefix}${FlowUiLabel.Episodes}`))
    .toBeVisible({ timeout: FlowTimeout.Medium })
  await expect(page.locator(FlowSelector.Heading).first())
    .toBeVisible({ timeout: FlowTimeout.Long })
}

export async function expectEpisodeHeader(page: Page): Promise<void> {
  await expect(page.locator(FlowSelector.Heading).first()).toBeVisible()
  const untitled = page.locator(`${FlowSelector.TextPrefix}${FlowUiLabel.UntitledEpisode}`).first()
  const header = page.locator(FlowSelector.Heading).first()
  await expect(untitled.or(header)).toBeVisible()
}

export { FlowPrompt, FlowTool, FlowCharacter }
