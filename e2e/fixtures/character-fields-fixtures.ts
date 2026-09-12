import { expect, type Page, type Response } from '@playwright/test'
import {
  CHARACTER_DIALOG_TITLE_EDIT,
  CHARACTER_DIALOG_TOAST_GENERATE_MISSING_FAILED,
  CharacterDialogGenerateMissingChat,
} from '@/domains/storyteller/ui/CharacterCreationDialog/constants/character-creation-dialog'
import { SectionPendingOverlayCopy } from '@/domains/storyteller/ui/WorldBible/utils/section-pending-overlay'
import { AssistantGenerationLabel } from '@/shared/chat/assistant/derive-assistant-generation-activity'
import {
  EmptyTurnScenario,
  FlowError,
  FlowHttp,
  FlowRole,
  FlowSelector,
  FlowStreamError,
  FlowTimeout,
  FlowTool,
  FlowUiLabel,
} from '../constants/storyteller-flow'

function isAssistantTurnPost(response: Response): boolean {
  return (
    response.url().includes(EmptyTurnScenario.AssistantPath) &&
    response.request().method() === FlowHttp.Post
  )
}

export async function expectAssistantTurnDidNotCrash(response: Response): Promise<void> {
  const body = await response.text()
  expect(body, FlowError.EditorInstructionsMissing).not.toContain(FlowStreamError.EditorInstructions)
  expect(body, FlowError.EditorInstructionsMissing).not.toContain(
    FlowStreamError.StoredAgentNoInstructions,
  )
}

export async function generateMissingCharacterFieldsLive(page: Page): Promise<void> {
  await page.getByLabel(FlowUiLabel.EditCharacter).click()
  await expect(page.getByRole(FlowRole.Heading, { name: CHARACTER_DIALOG_TITLE_EDIT })).toBeVisible()

  const description = page.getByPlaceholder(FlowUiLabel.CharacterDescriptionPlaceholder)
  await expect(description).toHaveValue('')

  const turn = page.waitForResponse(isAssistantTurnPost, { timeout: FlowTimeout.Generation })
  const generate = page.getByRole(FlowRole.Button, { name: FlowUiLabel.GenerateMissingFields })
  await expect(generate).toBeEnabled({ timeout: FlowTimeout.Medium })
  await generate.click()

  const bubble = page.locator(FlowSelector.UserMessage).filter({
    hasText: CharacterDialogGenerateMissingChat.MissingText,
  })
  await expect(bubble.first()).toBeVisible({ timeout: FlowTimeout.Medium })
  await expect(bubble.first()).toContainText(FlowTool.ProposeCharacterFields)

  await expectAssistantTurnDidNotCrash(await turn)

  const failedToast = page.getByText(CHARACTER_DIALOG_TOAST_GENERATE_MISSING_FAILED)
  const generationFailed = page.getByText(AssistantGenerationLabel.Error)
  const pending = page.getByText(SectionPendingOverlayCopy.Title)
  await expect(pending.or(failedToast).or(generationFailed).first()).toBeVisible({
    timeout: FlowTimeout.Generation,
  })
  if (await failedToast.isVisible() || await generationFailed.isVisible()) {
    throw new Error(FlowError.GenerateMissingFailed)
  }

  await page.getByRole(FlowRole.Button, { name: SectionPendingOverlayCopy.Accept }).click()
  await expect(description).not.toHaveValue('', { timeout: FlowTimeout.Medium })
}
