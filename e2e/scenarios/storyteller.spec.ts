import { test } from '@playwright/test'
import { setupAuthenticatedPage } from '../fixtures/auth-fixtures'
import {
  acceptPendingAction,
  createStoryProject,
  expectCharacterInSidebar,
  expectWorldBibleHasContent,
  gotoStoryteller,
  openStorybible,
  sendChatMessage,
  waitForAssistantStatus,
  warmAssistantChat,
  FlowCharacter,
  FlowPrompt,
} from '../fixtures/storyteller-fixtures'
import { FlowTest } from '../constants/storyteller-flow'

/**
 * Storyteller whole-flow critical path.
 *
 * Creates a fresh project, generates a storybible via the Writers Room (tool
 * proposals persist only after Add to world), verifies Overview has world
 * description, then creates a character that appears in the cast sidebar.
 */

test.describe(FlowTest.Describe, () => {
  test(FlowTest.Name, async ({ page }) => {
    test.setTimeout(900_000)
    await setupAuthenticatedPage(page)
    const project = await createStoryProject(page)
    await gotoStoryteller(page, project.id)
    await warmAssistantChat(page, project.id)

    await sendChatMessage(page, FlowPrompt.GenerateBible)
    await waitForAssistantStatus(page)
    try {
      await acceptPendingAction(page)
    } catch {
      await sendChatMessage(page, FlowPrompt.GenerateBible)
      await waitForAssistantStatus(page)
      await acceptPendingAction(page)
    }
    await openStorybible(page)
    await expectWorldBibleHasContent(page)

    await sendChatMessage(page, FlowPrompt.CreateCharacter)
    await waitForAssistantStatus(page)
    await expectCharacterInSidebar(page, FlowCharacter.Name)
  })
})
