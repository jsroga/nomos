import { Page, expect } from '@playwright/test'
import { setupAuthenticatedPage } from './auth-fixtures'
import { createStoryProject, gotoStoryteller } from './storyteller-fixtures'
import {
  DraftEpisodeSeed,
  DraftEpisodeSequence,
  DraftGhostField,
  DraftGhostToken,
  DraftHttp,
  DraftPhase,
  DraftPlanField,
  DraftRoute,
  DraftSelector,
  DraftTimeout,
  DraftTypedPrefix,
  DraftUiLabel,
} from '../constants/storyteller-draft'
import { FlowApi, FlowHttp, FlowRole, FlowTimeout } from '../constants/storyteller-flow'

export { setupAuthenticatedPage, createStoryProject, gotoStoryteller }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function createStoryEpisode(page: Page, projectId: string): Promise<{ id: string }> {
  const response = await page.request.post(FlowApi.Episodes, {
    data: {
      projectId,
      title: DraftEpisodeSeed.Title,
      sequence: DraftEpisodeSequence.First,
    },
  })
  expect(response.ok(), `Failed to create episode: ${await response.text()}`).toBeTruthy()
  const body: unknown = await response.json()
  const id = isRecord(body) && typeof body.id === 'string' ? body.id : ''
  expect(id.length).toBeGreaterThan(0)
  return { id }
}

async function waitForPhaseNavigator(page: Page): Promise<void> {
  await expect(
    page.getByRole(FlowRole.Button, { name: DraftUiLabel.Premise, exact: true })
  ).toBeVisible({ timeout: FlowTimeout.Medium })
}

function phaseButton(page: Page, name: DraftUiLabel) {
  return page.getByRole(FlowRole.Button, { name, exact: true })
}

async function seedWritingPhase(page: Page, episodeId: string): Promise<void> {
  const planResponse = await page.request.post(FlowApi.Plan, {
    data: {
      [DraftPlanField.EpisodeId]: episodeId,
      [DraftPlanField.CurrentPhase]: DraftPhase.Writing,
    },
  })
  expect(planResponse.ok(), `Failed to set writing phase: ${await planResponse.text()}`).toBeTruthy()
}

export async function setupDraftWorkspace(page: Page): Promise<{ projectId: string }> {
  await setupAuthenticatedPage(page)
  const project = await createStoryProject(page)
  const episode = await createStoryEpisode(page, project.id)
  await seedWritingPhase(page, episode.id)
  await gotoStoryteller(page, project.id, episode.id, { waitForChat: false })
  await waitForPhaseNavigator(page)
  return { projectId: project.id }
}

export async function openDraftTab(page: Page): Promise<void> {
  const locked = phaseButton(page, DraftUiLabel.DraftLocked)
  if (await locked.isVisible().catch(() => false)) {
    await expect(locked).toBeDisabled()
    return
  }
  const draft = phaseButton(page, DraftUiLabel.Draft)
  await expect(draft).toBeVisible()
  await draft.click()
  await expect(page.locator(DraftSelector.ScriptEditor).first()).toBeVisible()
}

export async function addOneBeatAndOpenDraft(page: Page): Promise<void> {
  const beats = phaseButton(page, DraftUiLabel.Beats)
  await expect(beats).toBeEnabled()
  await beats.click()
  const addBeat = page.getByRole(FlowRole.Button, { name: DraftUiLabel.AddBeat, exact: true }).first()
  await expect(addBeat).toBeVisible()
  await addBeat.click()
  const draft = phaseButton(page, DraftUiLabel.Draft)
  await expect(draft).toBeEnabled()
  await draft.click()
  await expect(page.locator(DraftSelector.ScriptEditor).first()).toBeVisible()
}

export async function stubScriptGhostComplete(page: Page): Promise<void> {
  await page.route(DraftRoute.ScriptComplete, async route => {
    if (route.request().method() !== FlowHttp.Post) {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: DraftHttp.Json,
      body: JSON.stringify({ [DraftGhostField.Result]: DraftGhostToken.Continuation }),
    })
  })
}

export async function typeDraftPrefixAndWaitForGhost(page: Page): Promise<void> {
  const editor = page.locator(DraftSelector.ScriptEditor).first()
  await editor.click()
  await editor.pressSequentially(DraftTypedPrefix.Chapel)
  await expect(page.getByText(DraftUiLabel.GhostHint)).toBeVisible({ timeout: DraftTimeout.Ghost })
  await expect(page.getByText(DraftGhostToken.Continuation)).toBeVisible({ timeout: DraftTimeout.Ghost })
}
