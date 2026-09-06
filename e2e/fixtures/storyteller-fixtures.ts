import { Page, expect } from '@playwright/test'
import {
  FlowApi,
  FlowCharacter,
  FlowChatModel,
  FlowChatRole,
  FlowCookie,
  FlowError,
  FlowHttp,
  FlowPrompt,
  FlowSelector,
  FlowSse,
  FlowTest,
  FlowTimeout,
  FlowTool,
  FlowUiLabel,
  FlowRoute,
  FlowKey,
  FlowRole,
  FlowQueryParam,
} from '../constants/storyteller-flow'
import { ASSISTANT_THREAD_COPY } from '@/shared/chat/core/constants/assistant-thread-ui'
import { EMPTY_TURN_NOTICE } from '@/shared/chat/assistant/assistant-stream-timing'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'

const BASE_URL = process.env.BASE_URL?.trim() || 'http://localhost:3001'
const SSE_TIMEOUT = 240_000
// Sourced from the component's own copy: a hard-coded duplicate silently went
// stale ("Write a message…") and every chat spec failed on a missing composer.
const CHAT_INPUT = `${FlowSelector.TextArea}[placeholder="${ASSISTANT_THREAD_COPY.InputPlaceholder}"]`
const ASSISTANT_WARM_PATH = '/api/assistant/storyteller'
const CHAT_SEND_TIMEOUT = FlowTimeout.Medium
/** assistant-ui composer state lags keystrokes; one Enter may not register. */
const ENTER_SETTLE_TIMEOUT = 2_000
const CHAT_STATUS_TIMEOUT = FlowTimeout.Short
const CHAT_WARMUP_TIMEOUT = FlowTimeout.Long
/**
 * "The assistant replied" = non-empty text plus an idle composer. The previous
 * check required one of nine English words, so a perfectly good reply worded
 * differently failed the run. See .local/findings/word-dictionary-heuristics.md.
 */
const MIN_REPLY_LENGTH = 1

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

function parseSseText(text: string): SseEvent[] {
  const events: SseEvent[] = []
  for (const line of text.split('\n')) {
    if (!line.startsWith(FlowSse.DataPrefix)) continue
    try {
      const parsed = JSON.parse(line.slice(FlowSse.DataPrefix.length))
      if (isSseEvent(parsed)) events.push(parsed)
    } catch { /* skip invalid JSON */ }
  }
  return events
}

export async function sendChatStream(page: Page, projectId: string, message: string): Promise<SseEvent[]> {
  const response = await page.request.post(FlowApi.ChatStream, {
    data: {
      message,
      projectId,
      traceId: `e2e-chat-${Date.now()}`,
    },
    timeout: SSE_TIMEOUT,
  })
  const text = await response.text()
  expect(response.ok(), `chat stream ${response.status()}: ${text}`).toBeTruthy()
  return parseSseText(text)
}

export async function sendChatMessage(page: Page, message: string): Promise<void> {
  const input = page.locator(CHAT_INPUT).first()
  await expect(input).toBeVisible()
  await input.click()
  // Real keystrokes, not fill(): assistant-ui's composer is a controlled input
  // whose state ignores a programmatic value set.
  await input.pressSequentially(message)
  await expect(input).toHaveValue(message)
  // Enter, not the Send button — the composer advertises "ENTER TO SEND", and
  // the button reads `canSend` off the new aui store while this composer writes
  // the legacy runtime, so it stays disabled with text present. The composer
  // state also lags the keystrokes, so retry Enter until the field clears
  // rather than sleeping on a guessed settle time.
  await expect(async () => {
    if ((await input.inputValue()) !== '') await input.press(FlowKey.Enter)
    await expect(input).toHaveValue('', { timeout: ENTER_SETTLE_TIMEOUT })
  }).toPass({ timeout: CHAT_SEND_TIMEOUT })
}

export async function waitForAssistantStatus(page: Page): Promise<void> {
  await expect(page.locator(FlowSelector.RunningStatus).first()).toBeVisible({
    timeout: CHAT_STATUS_TIMEOUT,
  })
}

export async function waitForAssistantResponse(
  page: Page,
  timeoutMs: number = FlowTimeout.Long,
): Promise<string> {
  const assistant = page.locator(FlowSelector.AssistantMessage).first()
  await expect(assistant).toBeVisible({ timeout: timeoutMs })
  // Settled = the thinking indicator is gone and real text has rendered.
  await expect(page.locator(FlowSelector.RunningStatus)).toHaveCount(0, {
    timeout: timeoutMs,
  })
  const text = (await assistant.textContent())?.trim() ?? ''
  expect(text.length).toBeGreaterThanOrEqual(MIN_REPLY_LENGTH)
  return text
}

export async function acceptPendingAction(page: Page): Promise<void> {
  const addToWorld = page.getByRole(FlowRole.Button, { name: FlowUiLabel.AddToWorld }).first()
  const accept = page.getByRole(FlowRole.Button, { name: FlowUiLabel.Accept }).first()
  const action = addToWorld.or(accept).first()
  const emptyTurn = page.getByText(EMPTY_TURN_NOTICE).first()
  await expect(action.or(emptyTurn).first()).toBeVisible({ timeout: FlowTimeout.Generation })
  if (await emptyTurn.isVisible()) {
    throw new Error(FlowError.EmptyTurnBeforeAccept)
  }
  await action.click()
  const updateAll = page.getByRole(FlowRole.Button, { name: FlowUiLabel.UpdateAll }).first()
  await updateAll.click({ timeout: FlowTimeout.Short }).catch(() => undefined)
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
  const response = await page.request.post(FlowApi.Projects, {
    data: { name, description: FlowTest.ProjectDescription },
  })

  expect(response.ok(), `Failed to create project: ${await response.text()}`).toBeTruthy()

  const body = await response.json()
  expect(isString(body.id)).toBe(true)

  return { id: body.id, name }
}

export async function gotoStoryteller(
  page: Page,
  projectId: string,
  episodeId?: string,
  options?: { waitForChat?: boolean }
): Promise<void> {
  const chatModel = process.env.STORYTELLER_CHAT_MODEL?.trim() || FlowChatModel.Luna
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value)
    },
    { key: LocalStorageKeys.STORYTELLER_CHAT_MODEL, value: chatModel },
  )
  // The chat fires a warm GET when it mounts. Interactions before the runtime
  // is live are silently dropped and never replayed, so wait for it here rather
  // than letting every spec race the same window.
  const chatWarmed = page
    .waitForResponse(
      response =>
        response.url().includes(ASSISTANT_WARM_PATH) && response.request().method() === 'GET',
      { timeout: FlowTimeout.Long }
    )
    .catch(() => undefined)

  const search = episodeId
    ? `?${FlowQueryParam.EpisodeId}=${encodeURIComponent(episodeId)}`
    : ''
  await page.goto(`/${projectId}/storyteller${search}`, { waitUntil: FlowRoute.DomContentLoaded })
  await expect(page.locator(`${FlowSelector.TextPrefix}${FlowUiLabel.Storyteller}`)).toBeVisible()
  await expect(page.locator(`${FlowSelector.TextPrefix}${FlowUiLabel.LoadingProject}`)).toBeHidden({ timeout: FlowTimeout.Long })
  await chatWarmed
  if (options?.waitForChat === false) return
  await expect(page.locator(CHAT_INPUT).first()).toBeEnabled({ timeout: FlowTimeout.Medium })
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
  const overview = page.getByRole(FlowRole.Heading, { name: FlowUiLabel.Overview })
  if (await overview.isVisible().catch(() => false)) return

  const createManually = page.getByRole(FlowRole.Button, { name: FlowUiLabel.CreateManually })
  const openLabel = page.getByRole(FlowRole.Button, { name: FlowUiLabel.OpenStorybible })
  if (await createManually.isVisible().catch(() => false)) {
    await createManually.click()
  } else if (await openLabel.isVisible().catch(() => false)) {
    await openLabel.click()
  } else {
    const tab = page.getByRole(FlowRole.Tab, { name: FlowUiLabel.StorybibleTab })
    await expect(tab).toBeVisible()
    await tab.click()
  }

  await expect(overview).toBeVisible({ timeout: FlowTimeout.Medium })
}

export async function expectWorldBibleHasContent(page: Page): Promise<void> {
  await expect(page.getByRole(FlowRole.Heading, { name: FlowUiLabel.Overview })).toBeVisible()
  await expect(
    page.locator(`${FlowSelector.TextPrefix}${FlowUiLabel.NoWorldDescription}`).first(),
  ).toBeHidden()
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
  await expect(character).toBeVisible({ timeout: FlowTimeout.Generation })
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
