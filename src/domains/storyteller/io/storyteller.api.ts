import {
  storytellerBibleLockQuerySchema,
  storytellerBibleLockResponseSchema,
  storytellerCreateEpisodeRequestSchema,
  storytellerEpisodeResponseSchema,
  storytellerEpisodesQuerySchema,
  storytellerEpisodesResponseSchema,
  type StorytellerBibleLockResponse,
  type StorytellerEpisodeListItem,
  type StorytellerEpisodeResponse,
} from './storyteller.dto'

async function fetchAndParse<T>(input: RequestInfo | URL, schema: { parse: (value: unknown) => T }) {
  const response = await fetch(input)

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return schema.parse(await response.json())
}

export async function fetchStorytellerEpisodes(
  rawProjectId: string
): Promise<StorytellerEpisodeListItem[]> {
  const { projectId } = storytellerEpisodesQuerySchema.parse({ projectId: rawProjectId })
  return fetchAndParse(
    `/api/storyteller/episodes?projectId=${encodeURIComponent(projectId)}`,
    storytellerEpisodesResponseSchema
  )
}

export async function fetchStorytellerEpisode(
  episodeId: string
): Promise<StorytellerEpisodeResponse & { episode_prompt?: string | null }> {
  const episode = await fetchAndParse(
    `/api/storyteller/episodes/${encodeURIComponent(episodeId)}`,
    storytellerEpisodeResponseSchema
  )

  return {
    ...episode,
    episode_prompt: episode.masterPrompt ?? null,
  }
}

export async function fetchStorytellerBibleLock(
  rawProjectId: string
): Promise<StorytellerBibleLockResponse> {
  const { projectId } = storytellerBibleLockQuerySchema.parse({ projectId: rawProjectId })
  return fetchAndParse(
    `/api/storyteller/bible/lock?projectId=${encodeURIComponent(projectId)}`,
    storytellerBibleLockResponseSchema
  )
}

export function parseCreateStorytellerEpisodeRequest(input: unknown) {
  return storytellerCreateEpisodeRequestSchema.parse(input)
}
