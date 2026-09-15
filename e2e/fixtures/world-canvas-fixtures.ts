import { Page, expect } from '@playwright/test'
import { TourStepId } from '@/shared/tours/constants/tour-step-ids'
import { formatTileCoords, TileActionBarCopy } from '@/domains/2d-canvas/ui/utils/tile-action-bar'
import { WorldGenToolLabel } from '@/domains/2d-canvas/ui/constants/world-gen-toolbar'
import { WorldGenSidebarWorldCopy } from '@/domains/2d-canvas/ui/utils/sidebar'
import { TileReviewAcceptLabel } from '@/domains/2d-canvas/ui/constants/tile-review-dialog'
import {
  FlowHttp,
  FlowRoute,
  FlowSelector,
  FlowTimeout,
  FlowUiLabel,
} from '../constants/storyteller-flow'
import { LocalStorageKeys } from '@/shared/data/utils/localStorage'
import { WorkspaceChatOverlayStored } from '@/shared/chat/state/constants/workspace-chat-ui'
import { SmokeMatch } from '../constants/storyteller-smoke'
import {
  WorldCanvasCoord,
  WorldCanvasHttp,
  WorldCanvasJson,
  WorldCanvasPrompt,
  WorldCanvasRoute,
  WorldCanvasRunId,
  WorldCanvasStatus,
  WorldCanvasTileUrl,
} from '../constants/world-canvas'
import { createStoryProject } from './storyteller-fixtures'

export async function gotoWorldCanvas(page: Page, projectId: string): Promise<void> {
  await page.goto(`/${projectId}/2d-canvas`, { waitUntil: FlowRoute.DomContentLoaded })
  await expect(page.getByLabel(WorldGenToolLabel.Toolbar)).toBeVisible({
    timeout: FlowTimeout.Long,
  })
}

export async function openWorldCanvasProject(page: Page): Promise<{ id: string }> {
  const project = await createStoryProject(page)
  await page.addInitScript(
    ({ key, closed }) => {
      localStorage.setItem(key, closed)
    },
    {
      key: LocalStorageKeys.WORKSPACE_CHAT_OVERLAY_OPEN,
      closed: WorkspaceChatOverlayStored.Closed,
    },
  )
  await gotoWorldCanvas(page, project.id)
  await expect(page.getByLabel(FlowUiLabel.WorkspaceChatPanel)).toBeHidden({
    timeout: FlowTimeout.Medium,
  })
  return project
}

export async function clickWorldTile(page: Page, x: number, y: number): Promise<void> {
  const canvas = page.locator(`#${TourStepId.WORLDGEN_CANVAS}`)
  const coord = canvas.getByText(formatTileCoords(x, y), { exact: true })
  await expect(coord).toBeVisible({ timeout: FlowTimeout.Medium })
  await coord.evaluate(node => {
    node.parentElement?.click()
  })
}

export async function generateOriginTile(page: Page): Promise<void> {
  const prompt = page.locator(`#${TourStepId.WORLDGEN_PROMPT}`)
  await expect(async () => {
    await clickWorldTile(page, 0, 0)
    await expect(prompt).toBeVisible({ timeout: FlowTimeout.Probe })
  }).toPass({ timeout: FlowTimeout.Medium })
  await expect(page.locator(`${FlowSelector.TextPrefix}${WorldCanvasCoord.Origin}`).first()).toBeVisible()
  await prompt.fill(WorldCanvasPrompt.Origin)
  await page.locator(`#${TourStepId.WORLDGEN_GENERATE}`).click()
}

export async function stubTileGenerationComplete(page: Page): Promise<void> {
  await page.route(WorldCanvasRoute.Trigger, async route => {
    if (route.request().method() !== FlowHttp.Post) return route.continue()
    await route.fulfill({
      status: 200,
      contentType: WorldCanvasJson.ContentType,
      body: JSON.stringify({ success: true, runId: WorldCanvasRunId.Complete }),
    })
  })
  await page.route(WorldCanvasRoute.Status, async route => {
    await route.fulfill({
      status: 200,
      contentType: WorldCanvasJson.ContentType,
      body: JSON.stringify({
        status: WorldCanvasStatus.Completed,
        output: {
          pendingReview: true,
          newUrl: WorldCanvasTileUrl.Stub,
          success: true,
        },
      }),
    })
  })
}

export async function stubTileGenerationBusy(page: Page): Promise<void> {
  await page.route(WorldCanvasRoute.Trigger, async route => {
    if (route.request().method() !== FlowHttp.Post) return route.continue()
    await route.fulfill({
      status: 200,
      contentType: WorldCanvasJson.ContentType,
      body: JSON.stringify({ success: true, runId: WorldCanvasRunId.Busy }),
    })
  })
  await page.route(WorldCanvasRoute.Status, async route => {
    await route.fulfill({
      status: 200,
      contentType: WorldCanvasJson.ContentType,
      body: JSON.stringify({ status: WorldCanvasStatus.Executing }),
    })
  })
}

export async function stubTileGenerationPaymentRequired(
  page: Page,
  counts: { trigger: number },
): Promise<void> {
  await page.route(WorldCanvasRoute.Trigger, async route => {
    if (route.request().method() !== FlowHttp.Post) return route.continue()
    counts.trigger += 1
    await route.fulfill({
      status: WorldCanvasHttp.PaymentRequired,
      contentType: WorldCanvasJson.ContentType,
      body: JSON.stringify({ error: SmokeMatch.InsufficientCredits }),
    })
  })
}

export { TileActionBarCopy, TileReviewAcceptLabel, WorldGenSidebarWorldCopy, FlowUiLabel }
