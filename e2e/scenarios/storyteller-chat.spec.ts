import { test, expect } from '@playwright/test'
import { setupAuthenticatedPage } from '../fixtures/auth-fixtures'
import {
  createStoryProject,
  gotoStoryteller,
  sendChatMessage,
  waitForAssistantResponse,
  waitForAssistantStatus,
  warmAssistantChat,
  FlowPrompt,
} from '../fixtures/storyteller-fixtures'
import { FlowTest } from '../constants/storyteller-flow'

/**
 * Storyteller Writers Room: hello → visible working status → any text reply in <10s.
 * Warms the serverless chat function once so the timed assertion measures the
 * warm path (cold starts on Vercel can exceed 30s).
 */

test.describe(FlowTest.Describe, () => {
  test(FlowTest.ChatName, async ({ page }) => {
    test.setTimeout(90_000)
    await setupAuthenticatedPage(page)
    const project = await createStoryProject(page)
    await gotoStoryteller(page, project.id)
    await warmAssistantChat(page, project.id)

    await sendChatMessage(page, FlowPrompt.Hello)
    await waitForAssistantStatus(page)
    const response = await waitForAssistantResponse(page)
    expect(response.length).toBeGreaterThan(0)

    const userMessage = page.locator(`text=${FlowPrompt.Hello}`).first()
    await expect(userMessage).toBeVisible()
  })
})
