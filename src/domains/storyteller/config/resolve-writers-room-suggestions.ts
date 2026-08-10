import {
  WRITERS_ROOM_BIBLE_PART_PROMPTS,
  WRITERS_ROOM_SUGGESTION_LIMIT,
  WritersRoomBiblePart,
  WritersRoomSuggestionPrompt,
  WritersRoomSuggestionStage,
} from '@/domains/storyteller/config/constants/writers-room'

/** Minimal bible signals — accepts page StoryPlan without coupling to one schema module. */
export interface WritersRoomBibleSignals {
  worldDescription?: string | null
  worldRules?: readonly unknown[] | null
  factions?: readonly unknown[] | null
  plotTwists?: readonly unknown[] | null
  themes?: readonly unknown[] | null
  inspirations?: {
    books?: readonly unknown[] | null
    movies?: readonly unknown[] | null
    games?: readonly unknown[] | null
  } | null
  keyCharacters?: readonly unknown[] | null
}

export interface WritersRoomSuggestionInput {
  hasBible: boolean
  hasEpisodes: boolean
  currentEpisodeId: string | null | undefined
  characterCount: number
  storyPlan: WritersRoomBibleSignals | null | undefined
}

function listLength(value: readonly unknown[] | null | undefined): number {
  return Array.isArray(value) ? value.length : 0
}

function inspirationCount(storyPlan: WritersRoomBibleSignals | null | undefined): number {
  const inspirations = storyPlan?.inspirations
  if (!inspirations) return 0
  return (
    listLength(inspirations.books) +
    listLength(inspirations.movies) +
    listLength(inspirations.games)
  )
}

function isMissingPart(
  storyPlan: WritersRoomBibleSignals | null | undefined,
  part: WritersRoomBiblePart
): boolean {
  switch (part) {
    case WritersRoomBiblePart.WorldDescription:
      return !storyPlan?.worldDescription?.trim()
    case WritersRoomBiblePart.WorldRules:
      return listLength(storyPlan?.worldRules) === 0
    case WritersRoomBiblePart.Factions:
      return listLength(storyPlan?.factions) === 0
    case WritersRoomBiblePart.PlotTwists:
      return listLength(storyPlan?.plotTwists) === 0
    case WritersRoomBiblePart.Inspirations:
      return inspirationCount(storyPlan) === 0
    case WritersRoomBiblePart.Themes:
      return listLength(storyPlan?.themes) === 0
  }
}

const BIBLE_PART_ORDER: readonly WritersRoomBiblePart[] = [
  WritersRoomBiblePart.WorldDescription,
  WritersRoomBiblePart.WorldRules,
  WritersRoomBiblePart.Factions,
  WritersRoomBiblePart.PlotTwists,
  WritersRoomBiblePart.Inspirations,
  WritersRoomBiblePart.Themes,
]

export function missingWritersRoomBibleParts(
  storyPlan: WritersRoomBibleSignals | null | undefined
): WritersRoomBiblePart[] {
  return BIBLE_PART_ORDER.filter(part => isMissingPart(storyPlan, part))
}

function promptsForMissingParts(parts: WritersRoomBiblePart[]): string[] {
  return parts
    .slice(0, WRITERS_ROOM_SUGGESTION_LIMIT)
    .map(part => WRITERS_ROOM_BIBLE_PART_PROMPTS[part])
}

function takeSuggestions(...groups: readonly (readonly string[])[]): string[] {
  const out: string[] = []
  for (const group of groups) {
    for (const prompt of group) {
      if (out.includes(prompt)) continue
      out.push(prompt)
      if (out.length >= WRITERS_ROOM_SUGGESTION_LIMIT) return out
    }
  }
  return out
}

/** Bible is "ready enough" once core world prose exists and at most one section is still empty. */
function isBibleReadyEnough(
  hasBible: boolean,
  missing: WritersRoomBiblePart[]
): boolean {
  if (!hasBible) return false
  if (missing.includes(WritersRoomBiblePart.WorldDescription)) return false
  return missing.length <= 1
}

export function resolveWritersRoomSuggestionStage(
  input: WritersRoomSuggestionInput
): WritersRoomSuggestionStage {
  const missing = missingWritersRoomBibleParts(input.storyPlan)
  const bibleReady = isBibleReadyEnough(input.hasBible, missing)

  if (!input.hasBible || !bibleReady) {
    return missing.length >= 3 || !input.hasBible
      ? WritersRoomSuggestionStage.EmptyBible
      : WritersRoomSuggestionStage.BuildBible
  }

  if (input.characterCount === 0) {
    return WritersRoomSuggestionStage.NeedCast
  }

  if (!input.hasEpisodes) {
    return WritersRoomSuggestionStage.NeedEpisode
  }

  if (!input.currentEpisodeId) {
    return WritersRoomSuggestionStage.HasEpisodesNoSelection
  }

  return WritersRoomSuggestionStage.Writing
}

export function resolveWritersRoomSuggestions(
  input: WritersRoomSuggestionInput
): readonly string[] {
  const missing = missingWritersRoomBibleParts(input.storyPlan)
  const stage = resolveWritersRoomSuggestionStage(input)
  const biblePrompts = promptsForMissingParts(missing)

  switch (stage) {
    case WritersRoomSuggestionStage.EmptyBible:
      return takeSuggestions(
        biblePrompts.length > 0
          ? biblePrompts
          : [WritersRoomSuggestionPrompt.GenerateWorldDescription],
        [
          WritersRoomSuggestionPrompt.GenerateWorldRules,
          WritersRoomSuggestionPrompt.GenerateFactions,
          WritersRoomSuggestionPrompt.GenerateThemes,
        ]
      )

    case WritersRoomSuggestionStage.BuildBible:
      return takeSuggestions(biblePrompts, [
        WritersRoomSuggestionPrompt.CreateBibleCast,
        WritersRoomSuggestionPrompt.GenerateEpisodeRoadmap,
      ])

    case WritersRoomSuggestionStage.NeedCast:
      return takeSuggestions(
        [
          WritersRoomSuggestionPrompt.CreateBibleCast,
          WritersRoomSuggestionPrompt.AddBibleCharacter,
        ],
        biblePrompts,
        [WritersRoomSuggestionPrompt.CreateFirstEpisode]
      )

    case WritersRoomSuggestionStage.NeedEpisode:
      return [
        WritersRoomSuggestionPrompt.CreateFirstEpisode,
        WritersRoomSuggestionPrompt.DraftFirstEpisodePremise,
        WritersRoomSuggestionPrompt.GenerateEpisodeRoadmap,
      ]

    case WritersRoomSuggestionStage.HasEpisodesNoSelection:
      return [
        WritersRoomSuggestionPrompt.CreateAnotherEpisode,
        WritersRoomSuggestionPrompt.DraftFirstEpisodePremise,
        WritersRoomSuggestionPrompt.GenerateEpisodeRoadmap,
      ]

    case WritersRoomSuggestionStage.Writing:
      return [
        WritersRoomSuggestionPrompt.DraftNextBeat,
        WritersRoomSuggestionPrompt.AddCharacter,
        WritersRoomSuggestionPrompt.CheckContinuity,
      ]
  }
}

/** Character count from page cast + any plan-level keyCharacters still only on the bible. */
export function writersRoomCharacterCount(
  characters: readonly unknown[],
  storyPlan: WritersRoomBibleSignals | null | undefined
): number {
  if (characters.length > 0) return characters.length
  return listLength(storyPlan?.keyCharacters)
}
