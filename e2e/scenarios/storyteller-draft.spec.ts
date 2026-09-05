import { test, expect } from '@playwright/test'
import {
  addOneBeatAndOpenDraft,
  createStoryProject,
  gotoStoryteller,
  openDraftTab,
  setupAuthenticatedPage,
} from '../fixtures/storyteller-draft-fixtures'
import { DraftSelector, DraftTest, DraftTimeout, DraftUiLabel, DraftWidthToken } from '../constants/storyteller-draft'
import { FlowRole } from '../constants/storyteller-flow'

test.describe(DraftTest.Describe, () => {
  test(DraftTest.GenerateDisabled, async ({ page }) => {
    await setupAuthenticatedPage(page)
    const project = await createStoryProject(page)
    await gotoStoryteller(page, project.id)
    await openDraftTab(page)
    const generateNext = page.getByRole(FlowRole.Button, { name: DraftUiLabel.GenerateNext })
    const locked = page.getByRole(FlowRole.Button, { name: DraftUiLabel.DraftLocked })
    if (await locked.isVisible().catch(() => false)) {
      await expect(locked).toBeDisabled()
      return
    }
    await expect(generateNext).toBeDisabled()
    await expect(generateNext).toHaveAttribute('title', DraftUiLabel.BeatsGate)
  })

  test(DraftTest.ModeSwitch, async ({ page }) => {
    await setupAuthenticatedPage(page)
    const project = await createStoryProject(page)
    await gotoStoryteller(page, project.id)
    await addOneBeatAndOpenDraft(page)
    const editor = page.locator(DraftSelector.ScriptEditor).first()
    await expect(editor).toBeVisible()
    await expect(editor).toHaveClass(new RegExp(DraftWidthToken.Script))
    await page.getByRole(FlowRole.Button, { name: DraftUiLabel.Novel }).click()
    await expect(editor).toHaveClass(new RegExp(DraftWidthToken.Novel))
    await page.getByRole(FlowRole.Button, { name: DraftUiLabel.Script }).click()
    await expect(editor).toHaveClass(new RegExp(DraftWidthToken.Script))
  })

  test(DraftTest.GenerateNext, async ({ page }) => {
    test.setTimeout(DraftTimeout.Generation)
    await setupAuthenticatedPage(page)
    const project = await createStoryProject(page)
    await gotoStoryteller(page, project.id)
    await addOneBeatAndOpenDraft(page)
    const generateNext = page.getByRole(FlowRole.Button, { name: DraftUiLabel.GenerateNext })
    await expect(generateNext).toBeEnabled()
    await generateNext.click()
    const approve = page.getByRole(FlowRole.Button, { name: DraftUiLabel.Approve }).first()
    await expect(approve).toBeVisible({ timeout: DraftTimeout.Generation })
    await approve.click()
    const editor = page.locator(DraftSelector.ScriptEditor).first()
    await expect.poll(async () => ((await editor.innerText()) ?? '').trim().length, {
      timeout: DraftTimeout.Generation,
    }).toBeGreaterThan(0)
  })

  test(DraftTest.RegenerateSection, async ({ page }) => {
    test.setTimeout(DraftTimeout.Generation)
    await setupAuthenticatedPage(page)
    const project = await createStoryProject(page)
    await gotoStoryteller(page, project.id)
    await addOneBeatAndOpenDraft(page)
    const editor = page.locator(DraftSelector.ScriptEditor).first()
    await page.getByRole(FlowRole.Button, { name: DraftUiLabel.GenerateNext }).click()
    const approve = page.getByRole(FlowRole.Button, { name: DraftUiLabel.Approve }).first()
    await expect(approve).toBeVisible({ timeout: DraftTimeout.Generation })
    await approve.click()
    await expect.poll(async () => ((await editor.innerText()) ?? '').trim().length, {
      timeout: DraftTimeout.Generation,
    }).toBeGreaterThan(0)
    const before = ((await editor.innerText()) ?? '').trim()
    await page.getByRole(FlowRole.Button, { name: DraftUiLabel.RegenerateSection }).click()
    await expect(approve).toBeVisible({ timeout: DraftTimeout.Generation })
    await approve.click()
    await expect.poll(async () => {
      const text = ((await editor.innerText()) ?? '').trim()
      return text.length > 0 && text !== before ? 1 : 0
    }, { timeout: DraftTimeout.Generation }).toBe(1)
  })
})
