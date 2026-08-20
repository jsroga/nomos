import { BeatCardType } from '@/domains/storyteller/ui/BeatCard/constants/beat-card'
import { StoryboardVideoPreset } from '@/shared/ai/storyboard-video-env'

/** Cork board UI copy and agent prompts. */

export const CORK_BOARD_UNKNOWN_PROJECT = 'unknown'
export const CORK_BOARD_NEW_BEAT_LOGLINE = 'New Beat'
export const CORK_BOARD_NEW_BEAT_TYPE = BeatCardType.Setup

export const CORK_BOARD_DELETE_TITLE = 'Delete Beat'
export const CORK_BOARD_DELETE_DESCRIPTION = 'Are you sure you want to delete this beat?'
export const CORK_BOARD_DELETE_CONFIRM = 'Delete'
export const CORK_BOARD_DELETE_CANCEL = 'Cancel'
export const CORK_BOARD_IMAGES_CANCEL = CORK_BOARD_DELETE_CANCEL

export const CORK_BOARD_STORY_STATE_RULE =
  'storyStateChange describes solely a change in the world and must be quotable by a subsequent beat. Each successive revelation beat must introduce a new unknown rather than confirming the previous one.'

export const CORK_BOARD_BEAT_SHORT_RULE =
  `Keep every beat SHORT: logline max 20 words; visualHook, actionTaken, consequence, and storyStateChange each one short sentence. No paragraphs. ${CORK_BOARD_STORY_STATE_RULE}`

export const CORK_BOARD_FULL_BEAT_COUNT = 30
export const CORK_BOARD_LOADING_PLACEHOLDER_COUNT = 3

export enum CorkBoardLoadingKey {
  Placeholder = 'beat-loading',
}

export const CORK_BOARD_GENERATE_BEATS_PROMPT = `Generate the full beat board (text only) for this episode from the accepted episode premise and its 10-point plan. Cover the 10-point plan as the detailed breakdown of ROADMAP SLOT (see system context). If that block is absent, use the premise only. Create ${CORK_BOARD_FULL_BEAT_COUNT} beats with manage_beat create. Each beat needs logline, beatType, visualHook, charactersInvolved, actionTaken, consequence, and storyStateChange. ${CORK_BOARD_BEAT_SHORT_RULE} Cover the full arc. Do not draft scripts. Do not generate images. Do not call run_beat_draft_workflow.`

export enum CorkBoardPromptPlaceholder {
  Sequence = '{sequence}',
  Existing = '{existing}',
}

export enum CorkBoardExistingBeatsLabel {
  None = 'none yet — this is beat 1',
}

export enum CorkBoardBeatImagePolicy {
  Override = 'override',
  SkipExisting = 'skip-existing',
}

export enum CorkBoardBeatListSep {
  Join = '; ',
  Item = '. ',
}

export const CORK_BOARD_GENERATE_NEXT_BEAT_PROMPT = `Generate the next story beat only (text card) for this episode. Create exactly one beat with manage_beat create. Sequence {sequence}. Continue from the existing beats: {existing}. Use the episode premise, 10-point plan, and ROADMAP SLOT when that system-context block is present. The beat needs logline, beatType, visualHook, charactersInvolved, actionTaken, consequence, and storyStateChange. ${CORK_BOARD_BEAT_SHORT_RULE} Do not replace or delete existing beats. Do not draft a script. Do not generate images. Do not call run_beat_draft_workflow.`

export enum CorkBoardCopy {
  BeatBoardHeading = 'Beat Board',
  GenerateBeatBoard = 'Generate Beat Board',
  GenerateNextBeat = 'Generate Next Beat',
  GenerateImages = 'Generate all beat images',
  CancelStoryboard = 'Cancel storyboard generation',
  Generating = 'Generating…',
  EmptyTitle = 'No beat board yet',
  EmptyBody = 'Break the episode premise into 30 text beats. The premise needs a logline, Ozymandias pillars, and a 10-point plan.',
  ReadyTitle = 'Your beats are generated',
  ReadyBody = 'Add them to the beat board to review, reorder, and generate images.',
  AddToWorld = 'Add to world',
  ContinueToDraft = 'Beats Ready - Proceed to Draft',
  AddBeat = 'Add Beat',
  ReplaceTitle = 'Replace beat board',
  ReplaceDescription = 'This replaces the current beats with a new text board from the episode premise.',
  ReplaceConfirm = 'Replace',
  ReplaceCancel = 'Cancel',
  ImagesExistTitle = 'Some beats already have images',
  ImagesExistDescription = 'Override existing images, or skip those beats and only generate missing ones?',
  ImagesOverride = 'Override existing',
  ImagesSkip = 'Skip existing',
  AllImagesExist = 'All beats already have images',
  ImagesCancelled = 'Beat image generation cancelled',
  CombinedHeading = 'Storyboard video',
  CombinedSubtitle = 'Episode cinematic from beat stills',
  CombinedGenerate = 'Generate video',
  CombinedRegenerate = 'Regenerate video',
  CombinedEmpty = 'Generate a storyboard video',
  CombinedNeedBeats = 'Add beats first',
  CombinedNeedImages = 'Generate beat images first',
  VideoModelMenu = 'Storyboard video model',
  WritersRoomBusy = 'Writers Room is busy — finish the current reply, then generate beats',
}

export enum CorkBoardVideoPresetLabel {
  KlingFilm = 'Kling 3.0 · Film',
  KlingStoryboard = 'Kling 3.0 · Storyboard',
  SeedanceFilm = 'Seedance 2.5 · Film',
  SeedanceStoryboard = 'Seedance 2.5 · Storyboard',
}

export function corkBoardVideoPresetLabel(preset: StoryboardVideoPreset): CorkBoardVideoPresetLabel {
  if (preset === StoryboardVideoPreset.KlingFilm) return CorkBoardVideoPresetLabel.KlingFilm
  if (preset === StoryboardVideoPreset.SeedanceFilm) return CorkBoardVideoPresetLabel.SeedanceFilm
  if (preset === StoryboardVideoPreset.SeedanceStoryboard) {
    return CorkBoardVideoPresetLabel.SeedanceStoryboard
  }
  return CorkBoardVideoPresetLabel.KlingStoryboard
}

export const CORK_BOARD_VISUAL_DIRECTOR_SENDER = 'VisualDirector'
export const CORK_BOARD_STORYBOARD_STARTED_CONTENT = `**Storyboard Generation Started**

I'm creating visual storyboards for {count} beats...

*Generating...*`

export const CORK_BOARD_COUNT_PLACEHOLDER = '{count}'

export const CORK_BOARD_STORYBOARD_FAILED_LOG = 'Storyboard generation failed'
export const CORK_BOARD_BEAT_IMAGES_FAILED_TOAST = 'Beat image generation failed'

export enum CorkBoardMessageType {
  Ai = 'ai',
}

export enum CorkBoardUrlScheme {
  Http = 'http',
}

export enum CorkBoardExpandedId {
  StoryboardView = 'storyboard_view',
  PosterView = 'poster_view',
}

export const CORK_BOARD_DRAG_EFFECT_MOVE = 'move'
