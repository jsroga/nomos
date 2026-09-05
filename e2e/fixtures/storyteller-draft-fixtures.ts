import { Page, expect } from '@playwright/test'
import { setupAuthenticatedPage } from './auth-fixtures'
import { createStoryProject, gotoStoryteller } from './storyteller-fixtures'
import { DraftSelector, DraftUiLabel } from '../constants/storyteller-draft'
import { FlowRole } from '../constants/storyteller-flow'

export { setupAuthenticatedPage, createStoryProject, gotoStoryteller }

export async function openDraftTab(page: Page): Promise<void> {
  const draft = page.getByRole(FlowRole.Button, { name: DraftUiLabel.Draft }).first()
  const locked = page.getByRole(FlowRole.Button, { name: DraftUiLabel.DraftLocked }).first()
  if (await locked.isVisible().catch(() => false)) {
    await expect(locked).toBeDisabled()
    return
  }
  await expect(draft).toBeVisible()
  await draft.click()
  await expect(page.locator(DraftSelector.ScriptEditor).first()).toBeVisible()
}

export async function addOneBeatAndOpenDraft(page: Page): Promise<void> {
  const beats = page.getByRole(FlowRole.Button, { name: DraftUiLabel.Beats }).first()
  await expect(beats).toBeVisible()
  await beats.click()
  const addBeat = page.getByRole(FlowRole.Button, { name: DraftUiLabel.AddBeat }).first()
  await expect(addBeat).toBeVisible()
  await addBeat.click()
  const draft = page.getByRole(FlowRole.Button, { name: DraftUiLabel.Draft }).first()
  await expect(draft).toBeEnabled()
  await draft.click()
  await expect(page.locator(DraftSelector.ScriptEditor).first()).toBeVisible()
}
