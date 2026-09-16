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
  waitForAssistantIdle,
  waitForToolCall,
  warmAssistantChat,
  acceptPendingAction,
  maybeAcceptPendingAction,
  reloadStoryteller,
  FlowCharacter,
} from '../fixtures/storyteller-fixtures'
import { readLastAssistantText } from '../fixtures/storyteller-overlay'
import { logSt1Step, startSt1Progress, St1Step } from '../fixtures/st1-progress'
import { FlowError, FlowRole, FlowTest, FlowTimeout, FlowTool, FlowUiLabel } from '../constants/storyteller-flow'
import { ConsistencyPrompt } from '../constants/storyteller-consistency-prompts'
import { SmokeChatModel } from '../constants/storyteller-smoke'

test.describe(FlowTest.Describe, () => {
  test(FlowTest.Name, async ({ page }) => {
    test.setTimeout(FlowTimeout.Live)
    const progress = startSt1Progress(page)
    await setupAuthenticatedPage(page)
    const credits = attachInsufficientCreditsGuard(page)
    const project = await createStoryProject(page)
    await gotoStoryteller(page, project.id, undefined, { chatModel: SmokeChatModel.Glm })
    await warmAssistantChat(page, project.id)
    await credits.assertOk()

    await expect(page.getByLabel(FlowUiLabel.WorkspaceChatPanel)).toBeVisible()

    logSt1Step(progress, St1Step.World)
    await chatAndAccept(page, ConsistencyPrompt.WorldDescriptionMundane)
    await credits.assertOk()
    logSt1Step(progress, St1Step.NoMagic)
    await chatAndAccept(page, ConsistencyPrompt.WorldRuleNoMagic)
    await credits.assertOk()
    await openStorybible(page)
    await expectWorldBibleHasContent(page)

    logSt1Step(progress, St1Step.Episode)
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

    logSt1Step(progress, St1Step.Vex)
    await sendChatMessage(page, ConsistencyPrompt.CharacterMage)
    await waitForAssistantStatus(page)
    try {
      await waitForToolCall(page, FlowTool.ManageCharacter, FlowTimeout.Long)
    } catch {
      await sendChatMessage(page, ConsistencyPrompt.CharacterMageInsist)
      await waitForAssistantStatus(page)
      try {
        await waitForToolCall(page, FlowTool.ManageCharacter, FlowTimeout.Long)
      } catch {
        /* CAST fail-fast below names the assistant reply */
      }
    }
    await waitForAssistantIdle(page)
    await maybeAcceptPendingAction(page)
    const lastAssistant = await readLastAssistantText(page)
    logSt1Step(progress, St1Step.ReloadCast)
    await reloadStoryteller(page)
    await expectCharacterInSidebar(page, FlowCharacter.Name, lastAssistant)
    await openStorybible(page)
    await expectWorldBibleHasContent(page)
    await credits.assertOk()

    const chatPanel = page.getByLabel(FlowUiLabel.WorkspaceChatPanel)
    if (await chatPanel.isVisible().catch(() => false)) {
      await page.getByRole(FlowRole.Button, { name: FlowUiLabel.WorkspaceChatToggle }).click()
      await expect(chatPanel).toBeHidden({ timeout: FlowTimeout.Medium })
    }

    logSt1Step(progress, St1Step.Fix)
    const fix = page.getByRole(FlowRole.Button, { name: FlowUiLabel.FixInconsistencies })
    await expect(fix).toBeEnabled()
    await fix.click()

    const applyAll = page.getByRole(FlowRole.Button, { name: FlowUiLabel.ApplyAll })
    const emptyReview = page.getByText(FlowUiLabel.NoInconsistencies)
    const scanError = page.getByText(FlowUiLabel.InternalServerError).first()
    const networkError = page
      .getByRole(FlowRole.Dialog, { name: FlowUiLabel.FixInconsistencies })
      .getByText(FlowUiLabel.NetworkError)
    await expect(applyAll.or(emptyReview).or(scanError).or(networkError).first()).toBeVisible({
      timeout: FlowTimeout.FixScan,
    })
    if (await scanError.isVisible()) {
      throw new Error(FlowError.FixScanInternalError)
    }
    if (await networkError.isVisible()) {
      throw new Error(FlowError.FixScanNetworkError)
    }
    if (await emptyReview.isVisible()) {
      throw new Error(FlowError.NoInconsistencies)
    }
    if (await applyAll.isEnabled()) {
      await applyAll.click()
      await expect(page.getByText(FlowUiLabel.ConsistencyFixesApplied)).toBeVisible({
        timeout: FlowTimeout.Generation,
      })
    } else {
      await expect(
        page
          .getByRole(FlowRole.Dialog, { name: FlowUiLabel.FixInconsistencies })
          .getByText(FlowCharacter.Name)
          .first(),
      ).toBeVisible()
    }
    await credits.assertOk()
  })
})
