import { Locator, Page, expect } from '@playwright/test'
import {
  EmptyTurnScenario,
  FlowApi,
  FlowCharacter,
  FlowEpisode,
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
  FlowLimit,
  FlowTool,
  FlowUiLabel,
  FlowRoute,
  FlowKey,
  FlowRole,
  FlowQueryParam,
} from '../constants/storyteller-flow'
import { ASSISTANT_THREAD_COPY } from '@/shared/chat/core/utils/assistant-thread-ui'
import { EMPTY_TURN_NOTICE, withStreamTiming } from '@/shared/chat/assistant/assistant-stream-timing'
import { LocalStorageKeys } from '@/shared/data/utils/localStorage'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { StorytellerHeaderCopy } from '@/domains/storyteller/ui/StorytellerLayout/constants/storyteller-module-header'
import { StorytellerSidebarCopy } from '@/domains/storyteller/ui/StorytellerLayout/utils/storyteller-sidebar-footer'
import { WritersRoomCastConfirm } from '@/domains/storyteller/ui/StorytellerLayout/utils/writers-room-copy'
import { SmokeHttpStatus, SmokeMatch } from '../constants/storyteller-smoke'

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

async function chatSurface(page: Page): Promise<Page | Locator> {
  const panel = page.getByLabel(FlowUiLabel.WorkspaceChatPanel)
  if (await panel.isVisible()) return panel
  return page
}

export async function sendChatMessage(page: Page, message: string): Promise<void> {
  await skipNewCastDialog(page)
  const input = (await chatSurface(page)).locator(CHAT_INPUT).first()
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
  const surface = await chatSurface(page)
  await expect(surface.locator(FlowSelector.RunningStatus).first()).toBeVisible({
    timeout: CHAT_STATUS_TIMEOUT,
  })
}

export async function waitForAssistantResponse(
  page: Page,
  timeoutMs: number = FlowTimeout.Long,
): Promise<string> {
  const surface = await chatSurface(page)
  const assistant = surface.locator(FlowSelector.AssistantMessage).first()
  await expect(assistant).toBeVisible({ timeout: timeoutMs })
  await expect(surface.locator(FlowSelector.RunningStatus)).toHaveCount(0, {
    timeout: timeoutMs,
  })
  const text = (await assistant.textContent())?.trim() ?? ''
  expect(text.length).toBeGreaterThanOrEqual(MIN_REPLY_LENGTH)
  return text
}

async function skipNewCastDialog(page: Page): Promise<void> {
  const dialog = page.getByRole(FlowRole.Dialog, { name: WritersRoomCastConfirm.Title })
  try {
    await expect(dialog).toBeVisible({ timeout: FlowTimeout.Short })
  } catch {
    return
  }
  await dialog.getByRole(FlowRole.Button, { name: WritersRoomCastConfirm.Cancel }).click()
  await expect(dialog).toBeHidden({ timeout: FlowTimeout.Medium })
}

async function confirmAddToWorldDialog(page: Page): Promise<void> {
  const addToWorldDialog = page.getByRole(FlowRole.Dialog, { name: FlowUiLabel.AddToWorld })
  const updateAll = page.getByRole(FlowRole.Button, { name: FlowUiLabel.UpdateAll }).first()
  try {
    await expect(addToWorldDialog).toBeVisible({ timeout: FlowTimeout.Short })
  } catch {
    await skipNewCastDialog(page)
    return
  }
  await expect(updateAll).toBeVisible({ timeout: FlowTimeout.Short })
  await updateAll.click()
  await skipNewCastDialog(page)
  await expect(addToWorldDialog).toBeHidden({ timeout: FlowTimeout.Medium })
}

async function acceptPendingReviewBanner(page: Page): Promise<void> {
  const ready = page.getByText(FlowUiLabel.NewContentReady, { exact: true }).first()
  if (!(await ready.isVisible().catch(() => false))) return
  await ready
    .locator('xpath=../following-sibling::div')
    .getByRole(FlowRole.Button, { name: FlowUiLabel.Accept })
    .click({ force: true })
  await expect(page.getByText(FlowUiLabel.PendingReview).first()).toBeHidden({
    timeout: FlowTimeout.Medium,
  })
}

async function clickEnabledAddToWorld(page: Page): Promise<boolean> {
  const surface = await chatSurface(page)
  const addToWorld = surface
    .getByRole(FlowRole.Button, {
      name: FlowUiLabel.AddToWorld,
      disabled: false,
    })
    .last()
  if (!(await addToWorld.isVisible().catch(() => false))) return false
  await addToWorld.click()
  await confirmAddToWorldDialog(page)
  await acceptPendingReviewBanner(page)
  return true
}

export async function acceptPendingAction(page: Page): Promise<void> {
  const surface = await chatSurface(page)
  const addToWorldDialog = page.getByRole(FlowRole.Dialog, { name: FlowUiLabel.AddToWorld })
  const addToWorld = surface
    .getByRole(FlowRole.Button, {
      name: FlowUiLabel.AddToWorld,
      disabled: false,
    })
    .last()
  const accept = surface.getByRole(FlowRole.Button, { name: FlowUiLabel.Accept }).last()
  const action = addToWorld.or(accept).first()
  const emptyTurn = surface.getByText(EMPTY_TURN_NOTICE).first()
  const pendingReview = page.getByText(FlowUiLabel.PendingReview).first()

  if (!(await addToWorldDialog.isVisible())) {
    await expect(action.or(emptyTurn).or(pendingReview).first()).toBeVisible({
      timeout: FlowTimeout.Generation,
    })
    if (await emptyTurn.isVisible()) {
      throw new Error(FlowError.EmptyTurnBeforeAccept)
    }
    if (await addToWorld.isVisible()) {
      await addToWorld.click()
    } else if (await accept.isVisible()) {
      await accept.click()
    }
  }

  await confirmAddToWorldDialog(page)
  await acceptPendingReviewBanner(page)

  for (let n = 0; n < FlowLimit.AddToWorldDrain; n += 1) {
    if (!(await clickEnabledAddToWorld(page))) break
  }
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

export interface GotoStorytellerOptions {
  waitForChat?: boolean
  chatModel?: string
}

export async function gotoStoryteller(
  page: Page,
  projectId: string,
  episodeId?: string,
  options?: GotoStorytellerOptions
): Promise<void> {
  const chatModel =
    options?.chatModel?.trim() ||
    process.env.STORYTELLER_CHAT_MODEL?.trim() ||
    FlowChatModel.Luna
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
        response.url().includes(ASSISTANT_WARM_PATH) && response.request().method() === FlowHttp.Get,
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
  await expect((await chatSurface(page)).locator(CHAT_INPUT).first()).toBeEnabled({
    timeout: FlowTimeout.Medium,
  })
}

export async function waitForToolCall(
  page: Page,
  toolName: string,
  timeoutMs: number = FlowTimeout.Long,
): Promise<void> {
  const toolCard = page.locator(FlowSelector.Div)
    .filter({ hasText: `${FlowSelector.ToolPrefix}${toolName}` })
    .first()
  await expect(toolCard).toBeVisible({ timeout: timeoutMs })
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

export async function reloadStoryteller(page: Page): Promise<void> {
  await page.reload({ waitUntil: FlowRoute.DomContentLoaded })
  await expect(page.locator(`${FlowSelector.TextPrefix}${FlowUiLabel.Storyteller}`)).toBeVisible()
  await expect(page.locator(`${FlowSelector.TextPrefix}${FlowUiLabel.LoadingProject}`)).toBeHidden({
    timeout: FlowTimeout.Long,
  })
}

export async function expectCharacterInSidebar(page: Page, name: string): Promise<void> {
  const panel = page.locator(`#${TOUR_STEP_IDS.STORYTELLER_CHARACTERS}`).first()
  await expect(panel).toBeVisible()
  await expect(panel.getByText(name, { exact: true })).toBeVisible({
    timeout: FlowTimeout.Generation,
  })
}

export async function draftFirstEpisode(page: Page): Promise<void> {
  const addToWorld = page.getByRole(FlowRole.Button, { name: FlowUiLabel.AddToWorld }).first()
  const accept = page.getByRole(FlowRole.Button, { name: FlowUiLabel.Accept }).first()
  if (await addToWorld.or(accept).first().isVisible().catch(() => false)) {
    await acceptPendingAction(page)
  }
  await expect(page.getByText(StorytellerSidebarCopy.BusyEpisode)).toBeHidden({
    timeout: FlowTimeout.Generation,
  })

  const headerDraft = page.getByRole(FlowRole.Tab, { name: FlowUiLabel.NewEpisode })
  if (await headerDraft.isVisible().catch(() => false)) {
    await headerDraft.click()
  } else {
    const button = page.locator(FlowSelector.Button)
      .filter({ hasText: FlowUiLabel.DraftFirstEpisode })
      .first()
    await expect(button).toBeVisible({ timeout: FlowTimeout.Short })
    await button.click()
  }
  const createDialog = page.getByRole(FlowRole.Dialog, { name: FlowUiLabel.NewEpisodeDialog })
  await expect(createDialog).toBeVisible({ timeout: FlowTimeout.Short })
  await createDialog.getByPlaceholder(FlowUiLabel.EpisodeTitlePlaceholder).fill(FlowEpisode.Title)
  await createDialog.getByRole(FlowRole.Button, { name: FlowUiLabel.CreateEpisode }).click()
  await expect(createDialog).toBeHidden({ timeout: FlowTimeout.Medium })
  await expect(page.getByRole(FlowRole.Tab, { name: StorytellerHeaderCopy.Episodes })).toBeVisible({
    timeout: FlowTimeout.Generation,
  })
  await expect(page.getByRole(FlowRole.Heading).first()).toBeVisible({
    timeout: FlowTimeout.Generation,
  })
}

export async function expectEpisodeHeader(page: Page): Promise<void> {
  const header = page.getByRole(FlowRole.Heading).first()
  await expect(header).toBeVisible()
  const untitled = page.locator(`${FlowSelector.TextPrefix}${FlowUiLabel.UntitledEpisode}`).first()
  await expect(untitled.or(header)).toBeVisible()
}

export async function chatAndAccept(page: Page, prompt: string): Promise<void> {
  await sendChatMessage(page, prompt)
  await waitForAssistantStatus(page)
  try {
    await acceptPendingAction(page)
  } catch {
    await sendChatMessage(page, prompt)
    await waitForAssistantStatus(page)
    await acceptPendingAction(page)
  }
}

export function attachInsufficientCreditsGuard(page: Page): { assertOk: () => Promise<void> } {
  let exhausted = false
  const pending: Promise<void>[] = []
  page.on('response', response => {
    if (response.status() !== SmokeHttpStatus.PaymentRequired) return
    pending.push(
      (async () => {
        const text = await response.text().catch(() => '')
        if (text.includes(SmokeMatch.InFlightRequests)) return
        exhausted = true
      })(),
    )
  })
  return {
    assertOk: async () => {
      await Promise.all(pending)
      if (exhausted) throw new Error(FlowError.OpenRouterCreditsExhausted)
    },
  }
}

const EMPTY_AGENT_FRAMES = [{ type: 'start-step' }, { type: 'finish-step' }, { type: 'finish' }]

function streamOf(chunks: unknown[]): ReadableStream {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
}

export async function emptyTurnSseBody(): Promise<string> {
  const stream = withStreamTiming(streamOf(EMPTY_AGENT_FRAMES), Date.now())
  const reader = stream.getReader()
  let body = `data: ${JSON.stringify({ type: 'start', messageId: 'm1' })}\n\n`
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    body += `data: ${JSON.stringify(value)}\n\n`
  }
  return `${body}${EmptyTurnScenario.DonePayload}`
}

export async function stubAssistantEmptyTurn(page: Page): Promise<string> {
  const body = await emptyTurnSseBody()
  await page.route(EmptyTurnScenario.AssistantRoute, async route => {
    if (route.request().method() !== FlowHttp.Post) return route.continue()
    await route.fulfill({
      status: 200,
      contentType: EmptyTurnScenario.SseContentType,
      body,
    })
  })
  return body
}

export async function createStoryCharacter(
  page: Page,
  projectId: string,
  name: string,
): Promise<void> {
  const response = await page.request.post(FlowApi.Characters, {
    data: { projectId, name },
  })
  expect(response.ok(), `Failed to create character: ${await response.text()}`).toBeTruthy()
}

export { FlowPrompt, FlowTool, FlowCharacter }
