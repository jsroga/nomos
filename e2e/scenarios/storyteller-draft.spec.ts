import { test, expect } from '@playwright/test'
import {
  addOneBeatAndOpenDraft,
  openDraftTab,
  setupDraftWorkspace,
  stubScriptGhostComplete,
  typeDraftPrefixAndWaitForGhost,
} from '../fixtures/storyteller-draft-fixtures'
import {
  DraftGhostToken,
  DraftKey,
  DraftSelector,
  DraftSkip,
  DraftTest,
  DraftTimeout,
  DraftUiLabel,
  DraftWidthToken,
} from '../constants/storyteller-draft'
import { FlowRole } from '../constants/storyteller-flow'

test.describe(DraftTest.Describe, () => {
  test(DraftTest.GenerateDisabled, async ({ page }) => {
    await setupDraftWorkspace(page)
    await openDraftTab(page)
    const generateNext = page.getByRole(FlowRole.Button, { name: DraftUiLabel.GenerateNext, exact: true })
    const locked = page.getByRole(FlowRole.Button, { name: DraftUiLabel.DraftLocked, exact: true })
    if (await locked.isVisible().catch(() => false)) {
      await expect(locked).toBeDisabled()
      return
    }
    await expect(generateNext).toBeDisabled()
    await expect(generateNext).toHaveAttribute('title', DraftUiLabel.BeatsGate)
  })

  test(DraftTest.ModeSwitch, async ({ page }) => {
    await setupDraftWorkspace(page)
    await addOneBeatAndOpenDraft(page)
    const editor = page.locator(DraftSelector.ScriptEditor).first()
    await expect(editor).toBeVisible()
    await expect(editor).toHaveClass(new RegExp(DraftWidthToken.Script))
    await page.getByRole(FlowRole.Button, { name: DraftUiLabel.Novel, exact: true }).click()
    await expect(editor).toHaveClass(new RegExp(DraftWidthToken.Novel))
    await page.getByRole(FlowRole.Button, { name: DraftUiLabel.Script, exact: true }).click()
    await expect(editor).toHaveClass(new RegExp(DraftWidthToken.Script))
  })

  test(DraftTest.GenerateNext, async ({ page }) => {
    test.skip(true, DraftSkip.LiveLlm)
    test.setTimeout(DraftTimeout.Generation)
    await setupDraftWorkspace(page)
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
    test.skip(true, DraftSkip.LiveLlm)
    test.setTimeout(DraftTimeout.Generation)
    await setupDraftWorkspace(page)
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

  test(DraftTest.GhostAccept, async ({ page }) => {
    test.setTimeout(DraftTimeout.Ghost)
    await setupDraftWorkspace(page)
    await addOneBeatAndOpenDraft(page)
    await stubScriptGhostComplete(page)
    await typeDraftPrefixAndWaitForGhost(page)
    const editor = page.locator(DraftSelector.ScriptEditor).first()
    await editor.press(DraftKey.Tab)
    await expect(page.getByText(DraftUiLabel.GhostHint)).toHaveCount(0)
    await expect(editor).toContainText(DraftGhostToken.Continuation)
  })

  test(DraftTest.GhostDismiss, async ({ page }) => {
    test.setTimeout(DraftTimeout.Ghost)
    await setupDraftWorkspace(page)
    await addOneBeatAndOpenDraft(page)
    await stubScriptGhostComplete(page)
    await typeDraftPrefixAndWaitForGhost(page)
    const editor = page.locator(DraftSelector.ScriptEditor).first()
    await editor.press(DraftKey.Escape)
    await expect(page.getByText(DraftUiLabel.GhostHint)).toHaveCount(0)
    await expect(editor).not.toContainText(DraftGhostToken.Continuation)
  })
})
