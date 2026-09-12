import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpStatus } from '@/shared/data/constants/protocol'
import { ClientFetchError } from '@/shared/data/fetch-json-record'
import { fetchWorkspaceProject } from '@/shared/workspace/io/project-session.api'
import type { WorkspaceProject } from '@/shared/workspace/types'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'

vi.mock('@/shared/workspace/io/project-session.api', () => ({
  fetchWorkspaceProject: vi.fn(),
  renameWorkspaceProject: vi.fn(),
}))

const PROJECT_ID = '9b80467c-18b5-4570-9b32-d66f86d71986'

const sampleProject: WorkspaceProject = {
  id: PROJECT_ID,
  name: 'Sample',
  master_prompt: '',
  series_bible: {},
  story_plan: {},
}

describe('useWorkspaceProjectStore.loadProject', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    useWorkspaceProjectStore.setState({ projects: [], currentProject: null })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    useWorkspaceProjectStore.setState({ projects: [], currentProject: null })
  })

  it('returns the project when fetch succeeds', async () => {
    vi.mocked(fetchWorkspaceProject).mockResolvedValue(sampleProject)
    await expect(useWorkspaceProjectStore.getState().loadProject(PROJECT_ID)).resolves.toEqual(
      sampleProject,
    )
    expect(useWorkspaceProjectStore.getState().currentProject).toEqual(sampleProject)
  })

  it('returns null when the API reports the project missing', async () => {
    vi.mocked(fetchWorkspaceProject).mockRejectedValue(
      new ClientFetchError('missing', HttpStatus.NOT_FOUND),
    )
    await expect(useWorkspaceProjectStore.getState().loadProject(PROJECT_ID)).resolves.toBeNull()
    expect(useWorkspaceProjectStore.getState().currentProject).toBeNull()
  })

  it('rethrows a 500 so the loader does not treat it as missing', async () => {
    const failure = new ClientFetchError('down', HttpStatus.INTERNAL)
    vi.mocked(fetchWorkspaceProject).mockRejectedValue(failure)
    await expect(useWorkspaceProjectStore.getState().loadProject(PROJECT_ID)).rejects.toBe(failure)
    expect(useWorkspaceProjectStore.getState().currentProject).toBeNull()
  })
})
