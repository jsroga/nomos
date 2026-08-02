import { test } from '@playwright/test'
import { setupAuthenticatedPage } from '../fixtures/auth-fixtures'
import {
  createStoryProject,
  expectCharacterInSidebar,
  expectWorldBibleHasContent,
  gotoStoryteller,
  openStorybible,
  sendChatStream,
  FlowCharacter,
  FlowPrompt,
} from '../fixtures/storyteller-fixtures'
import { FlowTest } from '../constants/storyteller-flow'

/**
 * Storyteller whole-flow critical path.
 *
 * Creates a fresh project, generates a storybible via the chat API, verifies
 * persistence in the World Bible panel, and creates a character that appears
 * in the cast sidebar. The chat UI is currently verified by the dedicated
 * chat-responds test; this test drives the LLM through the same API endpoint.
 */

test.describe(FlowTest.Describe, () => {
  test(FlowTest.Name, async ({ page }) => {
    test.setTimeout(600_000)
    await setupAuthenticatedPage(page)
    const project = await createStoryProject(page)
    await gotoStoryteller(page, project.id)

    // 1. Generate storybible and verify it persists in the UI.
    await sendChatStream(page, project.id, FlowPrompt.GenerateBible)
    await openStorybible(page)
    await expectWorldBibleHasContent(page)

    // 2. Create a character and verify it appears in the sidebar.
    await sendChatStream(page, project.id, FlowPrompt.CreateCharacter)
    await expectCharacterInSidebar(page, FlowCharacter.Name)
  })
})
