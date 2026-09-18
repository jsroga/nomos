import { test, expect } from '@playwright/test'
import { setupAuthenticatedPage } from '../fixtures/auth-fixtures'
import {
  createStoryProject,
  gotoStoryteller,
  stubAssistantEmptyTurn,
} from '../fixtures/storyteller-fixtures'
import {
  EmptyTurnScenario,
  FlowEpisode,
  FlowRole,
  FlowRoute,
  FlowSelector,
  FlowTest,
  FlowTimeout,
  FlowUiLabel,
} from '../constants/storyteller-flow'
import { EMPTY_TURN_NOTICE } from '@/shared/chat/assistant/assistant-stream-timing'
import { LocalStorageKeys } from '@/shared/data/utils/localStorage'
import { WorkspaceChatOverlayStored } from '@/shared/chat/state/constants/workspace-chat-ui'

test.describe(FlowTest.Describe, () => {
  test(FlowTest.OverlayPersistName, async ({ page }) => {
    test.setTimeout(FlowTimeout.Stub)
    await setupAuthenticatedPage(page)
    const project = await createStoryProject(page)
    await gotoStoryteller(page, project.id)

    const panel = page.getByLabel(FlowUiLabel.WorkspaceChatPanel)
    await expect(panel).toBeVisible()

    await page.getByRole(FlowRole.Button, { name: FlowUiLabel.WorkspaceChatToggle }).click()
    await expect(panel).toBeHidden()
    await expect
      .poll(() => page.evaluate(key => localStorage.getItem(key), LocalStorageKeys.WORKSPACE_CHAT_OVERLAY_OPEN))
      .toBe(WorkspaceChatOverlayStored.Closed)

    await page.reload({ waitUntil: FlowRoute.DomContentLoaded })
    await expect(page.locator(`${FlowSelector.TextPrefix}${FlowUiLabel.Storyteller}`)).toBeVisible()
    expect(
      await page.evaluate(key => localStorage.getItem(key), LocalStorageKeys.WORKSPACE_CHAT_OVERLAY_OPEN),
    ).toBe(WorkspaceChatOverlayStored.Closed)
    await expect(page.getByLabel(FlowUiLabel.WorkspaceChatPanel)).toBeHidden()

    await stubAssistantEmptyTurn(page)
    await page.getByRole(FlowRole.Button, { name: FlowUiLabel.WorkspaceChatToggle }).click()
    await expect(page.getByLabel(FlowUiLabel.WorkspaceChatPanel)).toBeVisible()

    const suggestion = page.locator(EmptyTurnScenario.SuggestionChip).first()
    await expect(suggestion).toBeVisible({ timeout: FlowTimeout.Medium })
    const suggestionText = (await suggestion.textContent())?.trim() ?? ''
    expect(suggestionText.length).toBeGreaterThan(0)
    await expect(async () => {
      if (await suggestion.isVisible()) await suggestion.click()
      await expect(page.getByText(suggestionText).first()).toBeVisible({
        timeout: FlowTimeout.Short,
      })
    }).toPass({ timeout: FlowTimeout.Long })
    await expect(page.getByText(EMPTY_TURN_NOTICE).first()).toBeVisible({
      timeout: FlowTimeout.Medium,
    })
    await expect(page.locator(FlowSelector.UserMessage).first()).toBeVisible()
  })

  test(FlowTest.ForeignEpisodeStorybible, async ({ page }) => {
    test.setTimeout(FlowTimeout.Stub)
    await setupAuthenticatedPage(page)
    const project = await createStoryProject(page)
    await gotoStoryteller(page, project.id, FlowEpisode.ForeignId, { waitForChat: false })

    await expect(page.getByRole(FlowRole.Dialog, { name: FlowUiLabel.NewEpisodeDialog })).toBeHidden()
    await expect(page.getByRole(FlowRole.Tab, { name: FlowUiLabel.StorybibleTab })).toBeVisible()
    await expect(page.getByRole(FlowRole.Heading, { name: FlowUiLabel.BuildStorybibleFirst })).toBeVisible({
      timeout: FlowTimeout.Medium,
    })
    await expect(page.getByRole(FlowRole.Button, { name: FlowUiLabel.CreateManually })).toBeVisible()
  })
})
