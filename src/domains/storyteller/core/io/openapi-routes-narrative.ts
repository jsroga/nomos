import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import {
  OpenApiStorytellerDescription,
  OpenApiStorytellerPath,
  OpenApiStorytellerSummary,
} from '@/domains/storyteller/core/io/constants/openapi-storyteller-wire'
import {
  openApiSuccessMessageSchema,
  stActionRequest,
  stActionResponse,
  stBeat,
  stBeatIdParams,
  stBeatList,
  stBibleLockGetResponse,
  stBibleLockPostRequest,
  stBibleLockPostResponse,
  stBibleLockQuery,
  stCreateBeatRequest,
  stCreateEpisodeBody,
  stEpisodeIdParams,
  stEpisodeResponse,
  stEpisodesQuery,
  stEpisodesResponse,
  stPatchBeatRequest,
  stPatchEpisodeRequest,
  stPlanQuery,
  stPlanResponse,
  stProjectIdQuery,
  stSavePlanRequest,
  stSavePlanResponse,
  stSnapshot,
  stSnapshotList,
  stSnapshotQuery,
  stTimelineQuery,
  stTimelineResponse,
  stUpsertSnapshotRequest,
  stWorldSummaryResponse,
} from '@/domains/storyteller/core/io/openapi-schemas'
import { OpenApiHttpMethod, OpenApiPath, OpenApiRouteDescription, OpenApiRouteSummary, OpenApiTag } from '@/shared/openapi/constants/openapi-wire'
import { registerJsonRoute } from '@/shared/openapi/route-helpers'

const tags = [OpenApiTag.Storyteller]

export function registerStorytellerNarrativeRoutes(registry: OpenAPIRegistry): void {
  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Get,
    path: OpenApiPath.StorytellerEpisodes,
    tags,
    summary: OpenApiRouteSummary.EpisodesList,
    query: stEpisodesQuery,
    successStatus: 200,
    successSchema: stEpisodesResponse,
    successDescription: OpenApiRouteDescription.EpisodeList,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Post,
    path: OpenApiPath.StorytellerEpisodes,
    tags,
    summary: OpenApiRouteSummary.EpisodesCreate,
    body: stCreateEpisodeBody,
    successStatus: 200,
    successSchema: stEpisodeResponse,
    successDescription: OpenApiRouteDescription.EpisodeCreated,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Get,
    path: OpenApiStorytellerPath.EpisodeById,
    tags,
    summary: OpenApiStorytellerSummary.EpisodesGet,
    params: stEpisodeIdParams,
    successStatus: 200,
    successSchema: stEpisodeResponse,
    successDescription: OpenApiStorytellerDescription.Episode,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Patch,
    path: OpenApiStorytellerPath.EpisodeById,
    tags,
    summary: OpenApiStorytellerSummary.EpisodesPatch,
    params: stEpisodeIdParams,
    body: stPatchEpisodeRequest,
    successStatus: 200,
    successSchema: stEpisodeResponse,
    successDescription: OpenApiStorytellerDescription.Episode,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Delete,
    path: OpenApiStorytellerPath.EpisodeById,
    tags,
    summary: OpenApiStorytellerSummary.EpisodesDelete,
    params: stEpisodeIdParams,
    successStatus: 200,
    successSchema: openApiSuccessMessageSchema,
    successDescription: OpenApiStorytellerDescription.Deleted,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Get,
    path: OpenApiStorytellerPath.EpisodeBeats,
    tags,
    summary: OpenApiStorytellerSummary.BeatsList,
    params: stEpisodeIdParams,
    successStatus: 200,
    successSchema: stBeatList,
    successDescription: OpenApiStorytellerDescription.BeatList,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Post,
    path: OpenApiStorytellerPath.EpisodeBeats,
    tags,
    summary: OpenApiStorytellerSummary.BeatsCreate,
    params: stEpisodeIdParams,
    body: stCreateBeatRequest,
    successStatus: 200,
    successSchema: stBeat,
    successDescription: OpenApiStorytellerDescription.Beat,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Patch,
    path: OpenApiStorytellerPath.BeatById,
    tags,
    summary: OpenApiStorytellerSummary.BeatsPatch,
    params: stBeatIdParams,
    body: stPatchBeatRequest,
    successStatus: 200,
    successSchema: stBeat,
    successDescription: OpenApiStorytellerDescription.Beat,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Delete,
    path: OpenApiStorytellerPath.BeatById,
    tags,
    summary: OpenApiStorytellerSummary.BeatsDelete,
    params: stBeatIdParams,
    successStatus: 200,
    successSchema: openApiSuccessMessageSchema,
    successDescription: OpenApiStorytellerDescription.Deleted,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Get,
    path: OpenApiPath.StorytellerBibleLock,
    tags,
    summary: OpenApiRouteSummary.BibleLockGet,
    query: stBibleLockQuery,
    successStatus: 200,
    successSchema: stBibleLockGetResponse,
    successDescription: OpenApiRouteDescription.LockStatus,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Post,
    path: OpenApiStorytellerPath.BibleLock,
    tags,
    summary: OpenApiStorytellerSummary.BibleLockPost,
    body: stBibleLockPostRequest,
    successStatus: 200,
    successSchema: stBibleLockPostResponse,
    successDescription: OpenApiStorytellerDescription.BibleLockUpdated,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Get,
    path: OpenApiStorytellerPath.Plan,
    tags,
    summary: OpenApiStorytellerSummary.PlanGet,
    query: stPlanQuery,
    successStatus: 200,
    successSchema: stPlanResponse,
    successDescription: OpenApiStorytellerDescription.Plan,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Post,
    path: OpenApiStorytellerPath.Plan,
    tags,
    summary: OpenApiStorytellerSummary.PlanSave,
    body: stSavePlanRequest,
    successStatus: 200,
    successSchema: stSavePlanResponse,
    successDescription: OpenApiStorytellerDescription.PlanSaved,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Patch,
    path: OpenApiStorytellerPath.Plan,
    tags,
    summary: OpenApiStorytellerSummary.PlanPatchSequence,
    body: stSavePlanRequest,
    successStatus: 200,
    successSchema: stSavePlanResponse,
    successDescription: OpenApiStorytellerDescription.PlanSaved,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Get,
    path: OpenApiStorytellerPath.Timeline,
    tags,
    summary: OpenApiStorytellerSummary.TimelineGet,
    query: stTimelineQuery,
    successStatus: 200,
    successSchema: stTimelineResponse,
    successDescription: OpenApiStorytellerDescription.Timeline,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Get,
    path: OpenApiStorytellerPath.WorldSummary,
    tags,
    summary: OpenApiStorytellerSummary.WorldSummaryGet,
    query: stProjectIdQuery,
    successStatus: 200,
    successSchema: stWorldSummaryResponse,
    successDescription: OpenApiStorytellerDescription.WorldSummary,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Get,
    path: OpenApiStorytellerPath.Snapshots,
    tags,
    summary: OpenApiStorytellerSummary.SnapshotsGet,
    query: stSnapshotQuery,
    successStatus: 200,
    successSchema: stSnapshotList,
    successDescription: OpenApiStorytellerDescription.SnapshotList,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Post,
    path: OpenApiStorytellerPath.Snapshots,
    tags,
    summary: OpenApiStorytellerSummary.SnapshotsUpsert,
    body: stUpsertSnapshotRequest,
    successStatus: 200,
    successSchema: stSnapshot,
    successDescription: OpenApiStorytellerDescription.Snapshot,
  })

  registerJsonRoute(registry, {
    method: OpenApiHttpMethod.Post,
    path: OpenApiStorytellerPath.Actions,
    tags,
    summary: OpenApiStorytellerSummary.ActionsPost,
    body: stActionRequest,
    successStatus: 200,
    successSchema: stActionResponse,
    successDescription: OpenApiStorytellerDescription.ActionDispatched,
  })
}
