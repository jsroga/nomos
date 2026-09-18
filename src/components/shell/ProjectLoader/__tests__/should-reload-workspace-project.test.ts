import { describe, expect, it } from 'vitest'
import {
  isProjectLoaderBlocking,
  isWorkspaceProjectReady,
  shouldReloadWorkspaceProject,
} from '../../should-reload-workspace-project'

const PROJECT_A = '11111111-1111-4111-8111-111111111111'
const PROJECT_B = '22222222-2222-4222-8222-222222222222'
const PROJECT_C = '33333333-3333-4333-8333-333333333333'
const PROJECT_D = '44444444-4444-4444-8444-444444444444'
const PROJECT_E = '55555555-5555-4555-8555-555555555555'

const PROJECT_IDS = [PROJECT_A, PROJECT_B, PROJECT_C, PROJECT_D, PROJECT_E] as const

describe('shouldReloadWorkspaceProject', () => {
  it('reloads when the URL project differs from the loaded store', () => {
    expect(
      shouldReloadWorkspaceProject({
        projectId: PROJECT_B,
        currentProjectId: PROJECT_A,
        loadedProjectId: PROJECT_A,
      }),
    ).toBe(true)
  })

  it('reloads when the ref already matches the URL but the store is still the previous project', () => {
    expect(
      shouldReloadWorkspaceProject({
        projectId: PROJECT_B,
        currentProjectId: PROJECT_A,
        loadedProjectId: PROJECT_B,
      }),
    ).toBe(true)
  })

  it('skips reload when URL, store, and ref already match', () => {
    expect(
      shouldReloadWorkspaceProject({
        projectId: PROJECT_A,
        currentProjectId: PROJECT_A,
        loadedProjectId: PROJECT_A,
      }),
    ).toBe(false)
  })
})

describe('isWorkspaceProjectReady', () => {
  it.each(
    PROJECT_IDS.flatMap(urlId =>
      [...PROJECT_IDS, undefined].flatMap(storeId =>
        [false, true].map(isLoading => ({
          urlId,
          storeId,
          isLoading,
          ready: !isLoading && storeId === urlId,
        })),
      ),
    ),
  )('url=$urlId store=$storeId loading=$isLoading → ready=$ready', ({ urlId, storeId, isLoading, ready }) => {
    expect(
      isWorkspaceProjectReady({
        urlProjectId: urlId,
        currentProjectId: storeId,
        isLoading,
      }),
    ).toBe(ready)
    expect(
      isProjectLoaderBlocking({
        isLoading,
        urlProjectId: urlId,
        currentProjectId: storeId,
      }),
    ).toBe(!ready)
  })

  it('is not ready when the URL has no project id', () => {
    expect(
      isWorkspaceProjectReady({
        urlProjectId: undefined,
        currentProjectId: PROJECT_A,
        isLoading: false,
      }),
    ).toBe(false)
  })
})
