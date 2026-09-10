import { recordFromJson, readNumber, readString } from '@/shared/data/json-guards'
import { ActionType } from '@/domains/storyteller/core/types/enums'
import {
  ACTION_ICON_BOLT,
  ACTION_ICON_BOOK,
  ACTION_ICON_BRAIN,
  ACTION_ICON_BULB,
  ACTION_ICON_COMMITTED,
  ACTION_ICON_EDIT,
  ACTION_ICON_LINK,
  ACTION_ICON_LOCK,
  ACTION_ICON_NOTE,
  ACTION_ICON_PERSON,
  ACTION_ICON_PLUS,
  ACTION_ICON_SCALE,
  ACTION_ICON_SCROLL,
  ACTION_ICON_SHUFFLE,
  ACTION_ICON_STRESS,
  ACTION_ICON_TARGET,
  ACTION_ICON_TRASH,
  ActionDisplayCopyText,
  ActionPayloadKey,
  BIBLE_TECHNICAL_PAYLOAD_KEYS,
  PREMISE_TECHNICAL_PAYLOAD_KEYS,
  type ActionDisplayCopy,
} from '../constants/action-display'

export {
  ACTION_ICON_BOLT,
  ACTION_ICON_BOOK,
  ACTION_ICON_BRAIN,
  ACTION_ICON_BULB,
  ACTION_ICON_COMMITTED,
  ACTION_ICON_EDIT,
  ACTION_ICON_LINK,
  ACTION_ICON_LOCK,
  ACTION_ICON_NOTE,
  ACTION_ICON_PERSON,
  ACTION_ICON_PLUS,
  ACTION_ICON_SCALE,
  ACTION_ICON_SCROLL,
  ACTION_ICON_SHUFFLE,
  ACTION_ICON_STRESS,
  ACTION_ICON_TARGET,
  ACTION_ICON_TRASH,
  ActionDisplayCopyText,
  ActionPayloadKey,
  BIBLE_TECHNICAL_PAYLOAD_KEYS,
  PREMISE_TECHNICAL_PAYLOAD_KEYS,
  type ActionDisplayCopy,
} from '../constants/action-display'

function loglineDescription(payload: Record<string, unknown>): string {
  return `"${readString(payload[ActionPayloadKey.Logline]) ?? ''}"`
}

function characterDescription(payload: Record<string, unknown>): string {
  return `"${readString(payload[ActionPayloadKey.Name]) ?? ''}" - ${readString(payload[ActionPayloadKey.Role]) ?? ''}`
}

function updateCharacterDescription(payload: Record<string, unknown>): string {
  return `Modified ${Object.keys(recordFromJson(payload[ActionPayloadKey.Updates])).length} fields`
}

function stressDescription(payload: Record<string, unknown>): string {
  const delta = readNumber(payload[ActionPayloadKey.Delta]) ?? 0
  const direction =
    delta > 0 ? ActionDisplayCopyText.Increased : ActionDisplayCopyText.Decreased
  return `Stress level ${direction}`
}

function knowledgeDescription(payload: Record<string, unknown>): string {
  return `Character learned: "${readString(payload[ActionPayloadKey.Knowledge]) ?? ''}"`
}

function bibleFieldCountDescription(payload: Record<string, unknown>): string {
  const keys = Object.keys(payload).filter(key => !BIBLE_TECHNICAL_PAYLOAD_KEYS.has(key))
  return `Modified ${keys.length} bible fields`
}

function premiseFieldCountDescription(payload: Record<string, unknown>): string {
  const premise = recordFromJson(payload[ActionPayloadKey.Premise])
  const keys = Object.keys(premise).filter(key => !PREMISE_TECHNICAL_PAYLOAD_KEYS.has(key))
  return `Modified ${keys.length} premise fields`
}

function ruleDescription(payload: Record<string, unknown>): string {
  return `"${readString(payload[ActionPayloadKey.Rule]) ?? ''}"`
}

function setupDescription(payload: Record<string, unknown>): string {
  return `"${readString(payload[ActionPayloadKey.Description]) ?? ''}"`
}

export const ACTION_DISPLAY_BY_TYPE: Partial<Record<ActionType, ActionDisplayCopy>> = {
  [ActionType.CREATE_BEAT]: {
    pendingTitle: ActionDisplayCopyText.CreateBeat,
    committedTitle: ActionDisplayCopyText.BeatCreated,
    pendingIcon: ACTION_ICON_NOTE,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: loglineDescription,
  },
  [ActionType.UPDATE_BEAT]: {
    pendingTitle: ActionDisplayCopyText.UpdateBeat,
    committedTitle: ActionDisplayCopyText.BeatUpdated,
    pendingIcon: ACTION_ICON_EDIT,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: () => ActionDisplayCopyText.BeatModification,
  },
  [ActionType.DELETE_BEAT]: {
    pendingTitle: ActionDisplayCopyText.DeleteBeat,
    committedTitle: ActionDisplayCopyText.BeatDeleted,
    pendingIcon: ACTION_ICON_TRASH,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: () => ActionDisplayCopyText.RemoveBeatFromBoard,
  },
  [ActionType.REORDER_BEATS]: {
    pendingTitle: ActionDisplayCopyText.ReorderBeats,
    committedTitle: ActionDisplayCopyText.BeatsReordered,
    pendingIcon: ACTION_ICON_SHUFFLE,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: () => ActionDisplayCopyText.ChangeBeatSequence,
  },
  [ActionType.LOCK_BEAT_BOARD]: {
    pendingTitle: ActionDisplayCopyText.LockBeatBoard,
    committedTitle: ActionDisplayCopyText.BeatBoardLocked,
    pendingIcon: ACTION_ICON_LOCK,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: () => ActionDisplayCopyText.ReadyForWriting,
  },
  [ActionType.CREATE_CHARACTER]: {
    pendingTitle: ActionDisplayCopyText.CreateCharacter,
    committedTitle: ActionDisplayCopyText.CharacterCreated,
    pendingIcon: ACTION_ICON_PERSON,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: characterDescription,
  },
  [ActionType.UPDATE_CHARACTER]: {
    pendingTitle: ActionDisplayCopyText.UpdateCharacter,
    committedTitle: ActionDisplayCopyText.CharacterUpdated,
    pendingIcon: ACTION_ICON_EDIT,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: updateCharacterDescription,
  },
  [ActionType.UPDATE_STRESS_LEVEL]: {
    pendingTitle: ActionDisplayCopyText.UpdateStress,
    committedTitle: ActionDisplayCopyText.StressUpdated,
    pendingIcon: ACTION_ICON_STRESS,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: stressDescription,
  },
  [ActionType.ADD_KNOWLEDGE]: {
    pendingTitle: ActionDisplayCopyText.AddKnowledge,
    committedTitle: ActionDisplayCopyText.KnowledgeAdded,
    pendingIcon: ACTION_ICON_BRAIN,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: knowledgeDescription,
  },
  [ActionType.UPDATE_SCRIPT]: {
    pendingTitle: ActionDisplayCopyText.UpdateScript,
    committedTitle: ActionDisplayCopyText.ScriptUpdated,
    pendingIcon: ACTION_ICON_SCROLL,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: () => ActionDisplayCopyText.FullScriptUpdate,
  },
  [ActionType.INSERT_SCRIPT_SECTION]: {
    pendingTitle: ActionDisplayCopyText.InsertSection,
    committedTitle: ActionDisplayCopyText.SectionInserted,
    pendingIcon: ACTION_ICON_PLUS,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: () => ActionDisplayCopyText.NewSceneAdded,
  },
  [ActionType.REVISE_SCRIPT_SECTION]: {
    pendingTitle: ActionDisplayCopyText.ReviseSection,
    committedTitle: ActionDisplayCopyText.SectionRevised,
    pendingIcon: ACTION_ICON_NOTE,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: () => ActionDisplayCopyText.SceneModified,
  },
  [ActionType.UPDATE_SERIES_BIBLE]: {
    pendingTitle: ActionDisplayCopyText.UpdateBible,
    committedTitle: ActionDisplayCopyText.BibleUpdated,
    pendingIcon: ACTION_ICON_BOOK,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: bibleFieldCountDescription,
  },
  [ActionType.UPDATE_WORLD_BIBLE]: {
    pendingTitle: ActionDisplayCopyText.UpdateBible,
    committedTitle: ActionDisplayCopyText.BibleUpdated,
    pendingIcon: ACTION_ICON_BOOK,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: bibleFieldCountDescription,
  },
  [ActionType.UPDATE_BIBLE]: {
    pendingTitle: ActionDisplayCopyText.UpdateBible,
    committedTitle: ActionDisplayCopyText.BibleUpdated,
    pendingIcon: ACTION_ICON_BOOK,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: bibleFieldCountDescription,
  },
  [ActionType.UPDATE_EPISODE_PREMISE]: {
    pendingTitle: ActionDisplayCopyText.UpdatePremise,
    committedTitle: ActionDisplayCopyText.PremiseUpdated,
    pendingIcon: ACTION_ICON_BULB,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: premiseFieldCountDescription,
  },
  [ActionType.ADD_WORLD_RULE]: {
    pendingTitle: ActionDisplayCopyText.AddWorldRule,
    committedTitle: ActionDisplayCopyText.RuleAdded,
    pendingIcon: ACTION_ICON_SCALE,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: ruleDescription,
  },
  [ActionType.ADD_SETUP]: {
    pendingTitle: ActionDisplayCopyText.AddSetup,
    committedTitle: ActionDisplayCopyText.SetupAdded,
    pendingIcon: ACTION_ICON_TARGET,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: setupDescription,
  },
  [ActionType.RESOLVE_SETUP]: {
    pendingTitle: ActionDisplayCopyText.ResolveSetup,
    committedTitle: ActionDisplayCopyText.SetupResolved,
    pendingIcon: ACTION_ICON_LINK,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: () => ActionDisplayCopyText.PayoffLinkingComplete,
  },
}

export const ACTION_DISPLAY_FALLBACK: ActionDisplayCopy = {
  pendingTitle: ActionDisplayCopyText.ExecuteAction,
  committedTitle: ActionDisplayCopyText.ActionExecuted,
  pendingIcon: ACTION_ICON_BOLT,
  committedIcon: ACTION_ICON_COMMITTED,
  describe: payload =>
    readString(payload[ActionPayloadKey.Type]) ?? ActionDisplayCopyText.FallbackAction,
}
