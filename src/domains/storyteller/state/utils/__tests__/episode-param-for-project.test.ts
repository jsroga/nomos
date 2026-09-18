import { describe, expect, it } from 'vitest'
import {
  resolveEpisodeIdForProject,
  shouldHydrateStorytellerProject,
} from '../episode-param-for-project'

const PROJECT_A = '11111111-1111-4111-8111-111111111111'
const PROJECT_B = '22222222-2222-4222-8222-222222222222'
const EPISODE_A1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const EPISODE_A2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
const EPISODE_B1 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
const EPISODE_B2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
const EPISODE_FOREIGN = 'ffffffff-ffff-4fff-8fff-fffffffffff1'

const EPISODE_PARAMS = [null, EPISODE_A1, EPISODE_A2, EPISODE_B1, EPISODE_B2, EPISODE_FOREIGN] as const
const LISTS: ReadonlyArray<{ name: string; ids: readonly string[] }> = [
  { name: 'empty', ids: [] },
  { name: 'a', ids: [EPISODE_A1, EPISODE_A2] },
  { name: 'b', ids: [EPISODE_B1, EPISODE_B2] },
  { name: 'mixed', ids: [EPISODE_A1, EPISODE_B1] },
]

describe('resolveEpisodeIdForProject', () => {
  it.each(
    EPISODE_PARAMS.flatMap(episodeParam =>
      LISTS.flatMap(list =>
        [false, true].map(episodesReady => {
          const belongs = episodeParam !== null && list.ids.includes(episodeParam)
          const episodeId = !episodeParam || !episodesReady || !belongs ? null : episodeParam
          const dropParam = Boolean(episodesReady && episodeParam && !belongs)
          return {
            episodeParam,
            list: list.name,
            ids: list.ids,
            episodesReady,
            episodeId,
            dropParam,
          }
        }),
      ),
    ),
  )(
    'param=$episodeParam list=$list ready=$episodesReady → id=$episodeId drop=$dropParam',
    ({ episodeParam, ids, episodesReady, episodeId, dropParam }) => {
      expect(
        resolveEpisodeIdForProject({
          episodeParam,
          episodeIds: ids,
          episodesReady,
        }),
      ).toEqual({ episodeId, dropParam })
    },
  )
})

describe('shouldHydrateStorytellerProject', () => {
  const ids = [undefined, PROJECT_A, PROJECT_B] as const
  it.each(
    ids.flatMap(routeProjectId =>
      ids.map(currentProjectId => ({
        routeProjectId,
        currentProjectId,
        hydrate: Boolean(routeProjectId && currentProjectId && routeProjectId === currentProjectId),
      })),
    ),
  )(
    'route=$routeProjectId store=$currentProjectId → hydrate=$hydrate',
    ({ routeProjectId, currentProjectId, hydrate }) => {
      expect(shouldHydrateStorytellerProject({ routeProjectId, currentProjectId })).toBe(hydrate)
    },
  )
})
