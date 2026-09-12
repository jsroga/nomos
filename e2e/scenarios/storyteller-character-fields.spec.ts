import { test } from '@playwright/test'
import { setupAuthenticatedPage } from '../fixtures/auth-fixtures'
import {
  attachInsufficientCreditsGuard,
  createStoryCharacter,
  createStoryProject,
  expectCharacterInSidebar,
  gotoStoryteller,
  FlowCharacter,
} from '../fixtures/storyteller-fixtures'
import { generateMissingCharacterFieldsLive } from '../fixtures/character-fields-fixtures'
import { FlowTest, FlowTimeout } from '../constants/storyteller-flow'
import { SmokeChatModel } from '../constants/storyteller-smoke'

test.describe(FlowTest.Describe, () => {
  test(FlowTest.CharacterFieldsName, async ({ page }) => {
    test.setTimeout(FlowTimeout.Live)
    await setupAuthenticatedPage(page)
    const credits = attachInsufficientCreditsGuard(page)
    const project = await createStoryProject(page)
    await createStoryCharacter(page, project.id, FlowCharacter.Name)
    await gotoStoryteller(page, project.id, undefined, { chatModel: SmokeChatModel.Glm })
    await expectCharacterInSidebar(page, FlowCharacter.Name)
    await generateMissingCharacterFieldsLive(page)
    await credits.assertOk()
  })
})
