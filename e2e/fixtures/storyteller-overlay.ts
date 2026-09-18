import { Locator, Page, expect } from '@playwright/test'
import { FlowRole, FlowSelector, FlowTimeout, FlowUiLabel } from '../constants/storyteller-flow'

export async function closeWorkspaceChatOverlay(page: Page): Promise<void> {
  const panel = page.getByLabel(FlowUiLabel.WorkspaceChatPanel)
  if (!(await panel.isVisible().catch(() => false))) return
  const toggle = page.getByRole(FlowRole.Button, { name: FlowUiLabel.WorkspaceChatToggle })
  if (!(await toggle.isVisible().catch(() => false))) return
  await toggle.click()
  await expect(panel).toBeHidden({ timeout: FlowTimeout.Medium })
}

export async function openWorkspaceChatOverlay(page: Page): Promise<void> {
  const panel = page.getByLabel(FlowUiLabel.WorkspaceChatPanel)
  if (await panel.isVisible().catch(() => false)) return
  const toggle = page.getByRole(FlowRole.Button, { name: FlowUiLabel.WorkspaceChatToggle })
  if (!(await toggle.isVisible().catch(() => false))) return
  await toggle.click()
  await expect(panel).toBeVisible({ timeout: FlowTimeout.Medium })
}

export async function readLastAssistantText(page: Page): Promise<string> {
  await openWorkspaceChatOverlay(page)
  const panel = page.getByLabel(FlowUiLabel.WorkspaceChatPanel)
  const surface: Page | Locator =
    (await panel.isVisible().catch(() => false)) ? panel : page
  const assistant = surface.locator(FlowSelector.AssistantMessage).last()
  if (!(await assistant.isVisible().catch(() => false))) return ''
  return (await assistant.textContent())?.trim() ?? ''
}

export async function createWorkspaceChatAndRestoreHistory(
  page: Page,
  previousUserText: string,
): Promise<void> {
  await openWorkspaceChatOverlay(page)
  await page.getByRole(FlowRole.Button, { name: FlowUiLabel.WorkspaceChatNew }).click()
  await page.getByRole(FlowRole.Button, { name: FlowUiLabel.WorkspaceChatHistory }).click()
  const items = page.getByRole(FlowRole.Menuitem)
  await expect(items).toHaveCount(2, { timeout: FlowTimeout.Medium })
  await items.nth(1).click()
  await expect(
    page.locator(FlowSelector.UserMessage).filter({ hasText: previousUserText }).first(),
  ).toBeVisible({ timeout: FlowTimeout.Medium })
}

export async function expectWorkspaceChatUserHistory(
  page: Page,
  previousUserText: string,
): Promise<void> {
  await openWorkspaceChatOverlay(page)
  await expect(
    page.locator(FlowSelector.UserMessage).filter({ hasText: previousUserText }).first(),
  ).toBeVisible({ timeout: FlowTimeout.Medium })
}
