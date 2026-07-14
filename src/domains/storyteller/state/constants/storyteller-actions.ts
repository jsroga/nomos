/** Storyteller actions hook wire values. */

import { StorytellerActionPrefix } from '@/domains/storyteller/core/storyteller-page-wire'
import { ActionType } from '@/domains/storyteller/core/types/Enums'
import { ActionApiResultType, HttpMethod } from '@/shared/data/constants/protocol'

export { ActionApiResultType as StorytellerActionResultType }
export { ActionType as StorytellerActionType }
export { HttpMethod as StorytellerActionsHttpMethod }
export { StorytellerActionPrefix as StorytellerActionsUpdatePrefix }

export enum StorytellerActionExtraResultType {
  WorldRuleAdded = 'world_rule_added',
}

export enum StorytellerActionsStorageKeyPrefix {
  ActionHistory = 'actionHistory_',
}

export enum StorytellerActionsLog {
  FailedLoadHistory = 'Failed to load action history:',
  FailedSaveHistory = 'Failed to save action history:',
  RefreshBeatsCalled = '🔄 refreshBeats called for episode:',
  FailedRefreshBeats = '❌ Failed to refresh beats:',
  BibleUpdatedApplying = '📚 [executeAction] Bible updated, applying to state:',
  BibleUpdatedAppliedFields = '📚 [executeAction] bible_updated - Applied fields:',
  CharactersSyncedRefetch = '🔄 [executeAction] Characters synced - refetching from characters table',
  FailedRefetchCharacters = 'Failed to refetch characters after sync',
  ApplyingUpdate = '📚 [executeAction] Applying',
  UpdatedStoryPlanFields = '📚 [executeAction] Updated storyPlan fields:',
  EpisodeUpdatedApplying = '📺 [executeAction] Episode updated, applying premise to state',
  ExecuteActionThrew = '❌ executeAction threw:',
}
