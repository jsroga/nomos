import { SoundtrackFieldAlias, StoryPlanMergeField } from '@/domains/storyteller/config/constants/bible-wire-fields'
import { inspirationsHaveItems } from '@/domains/storyteller/core/utils/bible-populated-fields'
import { recordArrayFromJson, recordFromJson, readString } from '@/shared/data/json-guards'

export interface HydratableProjectSignature {
  id?: string
  series_bible?: Record<string, unknown>
  story_plan?: Record<string, unknown>
}

enum SignatureField {
  Id = 'id',
  StoryWorldDescription = 'storyWorldDescription',
  StoryWorldRules = 'storyWorldRules',
  BibleWorldDescription = 'bibleWorldDescription',
  StorySoundtracks = 'storySoundtracks',
  BibleSoundtracks = 'bibleSoundtracks',
  StoryInspirations = 'storyInspirations',
  BibleInspirations = 'bibleInspirations',
  StoryMood = 'storyMood',
  BibleMood = 'bibleMood',
}

function moodFromRecord(record: Record<string, unknown>): string {
  return readString(record[SoundtrackFieldAlias.MoodSoundtrack]) ?? ''
}

export function storytellerHydrationSignature(
  project: HydratableProjectSignature | null | undefined,
): string | null {
  if (!project?.id) return null
  const storyPlan = recordFromJson(project.story_plan)
  const bible = recordFromJson(project.series_bible)
  return JSON.stringify({
    [SignatureField.Id]: project.id,
    [SignatureField.StoryWorldDescription]: storyPlan[StoryPlanMergeField.WorldDescription],
    [SignatureField.StoryWorldRules]: recordArrayFromJson(
      storyPlan[StoryPlanMergeField.WorldRules],
    ).length,
    [SignatureField.BibleWorldDescription]: bible[StoryPlanMergeField.WorldDescription],
    [SignatureField.StorySoundtracks]: recordArrayFromJson(
      storyPlan[StoryPlanMergeField.Soundtracks],
    ).length,
    [SignatureField.BibleSoundtracks]: recordArrayFromJson(
      bible[StoryPlanMergeField.Soundtracks],
    ).length,
    [SignatureField.StoryInspirations]: inspirationsHaveItems(
      storyPlan[StoryPlanMergeField.Inspirations],
    ),
    [SignatureField.BibleInspirations]: inspirationsHaveItems(
      bible[StoryPlanMergeField.Inspirations],
    ),
    [SignatureField.StoryMood]: moodFromRecord(storyPlan),
    [SignatureField.BibleMood]: moodFromRecord(bible),
  })
}
