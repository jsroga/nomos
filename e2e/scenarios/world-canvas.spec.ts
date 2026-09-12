import { test, expect } from '@playwright/test'
import { setupAuthenticatedPage } from '../fixtures/auth-fixtures'
import { TourStepId } from '@/shared/tours/constants/tour-step-ids'
import {
  clickWorldTile,
  generateOriginTile,
  openWorldCanvasProject,
  stubTileGenerationBusy,
  stubTileGenerationComplete,
  stubTileGenerationPaymentRequired,
  TileActionBarCopy,
  TileReviewAcceptLabel,
  WorldGenSidebarWorldCopy,
  FlowUiLabel,
} from '../fixtures/world-canvas-fixtures'
import { WorldGenToolLabel } from '@/domains/2d-canvas/ui/constants/world-gen-toolbar'
import {
  WORLD_CANVAS_TRIGGER_MAX,
  WORLD_CANVAS_TRIGGER_MIN,
  WORLD_CANVAS_UPSCALE_MAX_HEIGHT_PX,
  WorldCanvasAlt,
  WorldCanvasError,
  WorldCanvasTest,
  WorldCanvasTileUrl,
} from '../constants/world-canvas'
import { FlowRole, FlowTimeout } from '../constants/storyteller-flow'

test.describe(WorldCanvasTest.Describe, () => {
  test(WorldCanvasTest.AcceptNeighbor, async ({ page }) => {
    test.setTimeout(FlowTimeout.Stub)
    await setupAuthenticatedPage(page)
    await stubTileGenerationComplete(page)
    await openWorldCanvasProject(page)

    await expect(page.getByText(WorldGenSidebarWorldCopy.StyleImagesLabel)).toBeVisible()
    await generateOriginTile(page)

    const accept = page.getByRole(FlowRole.Button, { name: TileReviewAcceptLabel.Generation })
    await expect(accept).toBeVisible({ timeout: FlowTimeout.Medium })
    await accept.click()

    await expect(page.getByAltText(WorldCanvasAlt.Origin)).toBeVisible({
      timeout: FlowTimeout.Medium,
    })
    await expect(page.getByAltText(WorldCanvasAlt.East)).toHaveCount(0)
    await expect(page.locator(`img[src*="${WorldCanvasTileUrl.Stub}"]`)).toHaveCount(1)

    await clickWorldTile(page, 1, 0)
    await expect(page.getByAltText(WorldCanvasAlt.East)).toHaveCount(0)

    await clickWorldTile(page, 0, 0)
    const upscale = page.locator(`#${TourStepId.WORLDGEN_UPSCALE}`)
    await expect(upscale).toBeVisible()
    await expect(upscale).toContainText(TileActionBarCopy.Upscale)
    const box = await upscale.boundingBox()
    expect(box).not.toBeNull()
    expect(box?.height ?? 0).toBeLessThanOrEqual(WORLD_CANVAS_UPSCALE_MAX_HEIGHT_PX)
    await expect(upscale).toHaveCSS('white-space', 'nowrap')
  })

  test(WorldCanvasTest.Credits402, async ({ page }) => {
    test.setTimeout(FlowTimeout.Stub)
    await setupAuthenticatedPage(page)
    const counts = { trigger: 0 }
    await stubTileGenerationPaymentRequired(page, counts)
    await openWorldCanvasProject(page)
    await generateOriginTile(page)

    await expect(page.locator(`[title="${WorldCanvasError.TriggerFailed}"]`)).toBeVisible({
      timeout: FlowTimeout.Medium,
    })
    await expect(page.getByAltText(WorldCanvasAlt.Origin)).toHaveCount(0)
    expect(counts.trigger).toBeGreaterThanOrEqual(WORLD_CANVAS_TRIGGER_MIN)
    expect(counts.trigger).toBeLessThanOrEqual(WORLD_CANVAS_TRIGGER_MAX)
  })

  test(WorldCanvasTest.NavigateAway, async ({ page }) => {
    test.setTimeout(FlowTimeout.Stub)
    await setupAuthenticatedPage(page)
    await stubTileGenerationBusy(page)
    await openWorldCanvasProject(page)
    await generateOriginTile(page)
    await expect(page.getByText(TileActionBarCopy.Generating)).toBeVisible({
      timeout: FlowTimeout.Medium,
    })

    await page.getByTitle(FlowUiLabel.Storyteller).click()
    await expect(page.getByText(FlowUiLabel.Storyteller).first()).toBeVisible({
      timeout: FlowTimeout.Long,
    })

    await page.getByTitle(FlowUiLabel.InfiniteCanvas).click()
    await expect(page.getByLabel(WorldGenToolLabel.Toolbar)).toBeVisible({
      timeout: FlowTimeout.Long,
    })
    await expect(page.getByAltText(WorldCanvasAlt.Origin)).toHaveCount(0)
    await expect(page.getByText(TileActionBarCopy.Generating)).toBeVisible({
      timeout: FlowTimeout.Medium,
    })
  })
})
