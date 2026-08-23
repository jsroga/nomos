import { test, expect } from '@playwright/test'
import { setupAuthenticatedPage } from '../fixtures/auth-fixtures'
import { createStoryProject, gotoStoryteller } from '../fixtures/storyteller-fixtures'
import { EmptyTurnScenario, FlowTest, FlowTimeout } from '../constants/storyteller-flow'
import {
  EMPTY_TURN_NOTICE,
  withStreamTiming,
} from '@/shared/chat/assistant/assistant-stream-timing'

/**
 * A turn where the model answers with nothing must not render as silence.
 *
 * The assistant route is stubbed with the frames a real empty turn produces
 * (`start-step`, `finish-step`, `finish`), piped through the route's own
 * `withStreamTiming` so the browser receives exactly the bytes production
 * would send. No model call, so the assertion is deterministic.
 */

const EMPTY_AGENT_FRAMES = [
  { type: 'start-step' },
  { type: 'finish-step' },
  { type: 'finish' },
]

function streamOf(chunks: unknown[]): ReadableStream {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
}

async function emptyTurnSseBody(): Promise<string> {
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

test.describe(FlowTest.Describe, () => {
  test(EmptyTurnScenario.TestName, async ({ page }) => {
    test.setTimeout(90_000)
    await setupAuthenticatedPage(page)
    const project = await createStoryProject(page)

    const body = await emptyTurnSseBody()
    expect(body).toContain(EMPTY_TURN_NOTICE)

    await page.route(EmptyTurnScenario.AssistantRoute, async route => {
      // continue(), not fallback(): the GET warm has no other handler to fall
      // back to, and leaving it unresolved stalls the chat runtime.
      if (route.request().method() !== 'POST') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: EmptyTurnScenario.SseContentType,
        body,
      })
    })

    // gotoStoryteller waits for the chat runtime to be live.
    await gotoStoryteller(page, project.id)

    // Starter suggestion (autoSend) rather than the composer — this test is
    // about the notice, and the chip is the shortest path to a turn.
    const suggestion = page.locator(EmptyTurnScenario.SuggestionChip).first()
    await expect(suggestion).toBeVisible({ timeout: FlowTimeout.Medium })
    const suggestionText = (await suggestion.textContent())?.trim() ?? ''
    expect(suggestionText.length).toBeGreaterThan(0)

    // The thread silently drops interactions fired before its runtime is ready,
    // so retry the click until the user turn actually lands. Once it does the
    // empty state (and these chips) are gone, so this cannot double-send.
    await expect(async () => {
      if (await suggestion.isVisible()) await suggestion.click()
      await expect(page.getByText(suggestionText).first()).toBeVisible({
        timeout: FlowTimeout.Short,
      })
    }).toPass({ timeout: FlowTimeout.Long })
    await expect(page.getByText(EMPTY_TURN_NOTICE).first()).toBeVisible({
      timeout: FlowTimeout.Medium,
    })
  })
})
