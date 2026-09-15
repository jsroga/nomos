import { test, expect } from '@playwright/test'
import { setupAuthenticatedPage } from '../fixtures/auth-fixtures'
import {
  attachInsufficientCreditsGuard,
  chatAndAccept,
  createStoryProject,
  expectCharacterInSidebar,
  expectWorldBibleHasContent,
  gotoStoryteller,
  openStorybible,
  sendChatMessage,
  waitForAssistantStatus,
  waitForToolCall,
  warmAssistantChat,
  acceptPendingAction,
  reloadStoryteller,
  FlowCharacter,
} from '../fixtures/storyteller-fixtures'
import { FlowError, FlowRole, FlowTest, FlowTimeout, FlowTool, FlowUiLabel } from '../constants/storyteller-flow'
import { ConsistencyPrompt } from '../constants/storyteller-consistency-prompts'
import { SmokeChatModel } from '../constants/storyteller-smoke'
import { FIX_INCONSISTENCIES_APPLIED_MESSAGE } from '@/domains/storyteller/ai/workflows/constants/fix-inconsistencies-workflow'

test.describe(FlowTest.Describe, () => {
  test(FlowTest.Name, async ({ page }) => {
    test.setTimeout(FlowTimeout.Live)
    await setupAuthenticatedPage(page)
    const credits = attachInsufficientCreditsGuard(page)
    const project = await createStoryProject(page)
    await gotoStoryteller(page, project.id, undefined, { chatModel: SmokeChatModel.Glm })
    await warmAssistantChat(page, project.id)
    await credits.assertOk()

    await expect(page.getByLabel(FlowUiLabel.WorkspaceChatPanel)).toBeVisible()

    await chatAndAccept(page, ConsistencyPrompt.WorldDescriptionMundane)
    await credits.assertOk()
    await chatAndAccept(page, ConsistencyPrompt.WorldRuleNoMagic)
    await credits.assertOk()
    await openStorybible(page)
    await expectWorldBibleHasContent(page)

    await chatAndAccept(page, ConsistencyPrompt.EpisodePremise)
    await credits.assertOk()

    const regenerate = page.getByTitle(FlowUiLabel.RegenerateDescription)
    await expect(regenerate).toBeVisible({ timeout: FlowTimeout.Generation })
    await regenerate.click()
    try {
      await waitForAssistantStatus(page)
    } catch {
      // Artifact draft or overlay enqueue may skip the running chip.
    }
    const addToWorld = page.getByRole(FlowRole.Button, { name: FlowUiLabel.AddToWorld }).first()
    const accept = page.getByRole(FlowRole.Button, { name: FlowUiLabel.Accept }).first()
    if (await addToWorld.or(accept).first().isVisible().catch(() => false)) {
      await acceptPendingAction(page)
    }
    await credits.assertOk()

    await sendChatMessage(page, ConsistencyPrompt.CharacterMage)
    await waitForAssistantStatus(page)
    try {
      await waitForToolCall(page, FlowTool.ManageCharacter, FlowTimeout.Long)
    } catch {
      await sendChatMessage(page, ConsistencyPrompt.CharacterMageInsist)
      await waitForAssistantStatus(page)
      await waitForToolCall(page, FlowTool.ManageCharacter, FlowTimeout.Generation)
    }
    await acceptPendingAction(page)
    await reloadStoryteller(page)
    await expectCharacterInSidebar(page, FlowCharacter.Name)
    await openStorybible(page)
    await expectWorldBibleHasContent(page)
    await credits.assertOk()

    const chatPanel = page.getByLabel(FlowUiLabel.WorkspaceChatPanel)
    if (await chatPanel.isVisible().catch(() => false)) {
      await page.getByRole(FlowRole.Button, { name: FlowUiLabel.WorkspaceChatToggle }).click()
      await expect(chatPanel).toBeHidden()
    }

    const fix = page.getByRole(FlowRole.Button, { name: FlowUiLabel.FixInconsistencies })
    await expect(fix).toBeEnabled()
    await fix.click()

    const applyAll = page.getByRole(FlowRole.Button, { name: FlowUiLabel.ApplyAll })
    const emptyReview = page.getByText(FlowUiLabel.NoInconsistencies)
    const scanError = page.getByText(FlowUiLabel.InternalServerError)
    await expect(applyAll.or(emptyReview).or(scanError).first()).toBeVisible({
      timeout: FlowTimeout.FixScan,
    })
    if (await scanError.isVisible()) {
      throw new Error(FlowError.FixScanInternalError)
    }
    if (await emptyReview.isVisible()) {
      throw new Error(FlowError.NoInconsistencies)
    }
    await expect(applyAll).toBeEnabled()
    await applyAll.click()
    await expect(page.getByText(FIX_INCONSISTENCIES_APPLIED_MESSAGE)).toBeVisible({
      timeout: FlowTimeout.Generation,
    })
    await credits.assertOk()
  })
})
