import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  E2E_HARNESS_USER,
  OTHER_TENANT_USER,
  authModuleStub,
  harnessAccess,
  resetHarness,
  routeRequest,
  signIn,
} from '@/app/api/route-harness'
import { HttpMethod, HttpStatus } from '@/shared/data/constants/protocol'
import { MastraWorkflowStatus, QueryParam } from '@/shared/data/constants/protocol'
import { StorytellerWorkflowVerdict } from '@/domains/storyteller/core/storyteller-page-wire'

const getWorkflowRunById = vi.fn()
const resume = vi.fn()
const createRun = vi.fn()

vi.mock('@/shared/auth/auth', async () => authModuleStub())
vi.mock('@/shared/auth/project-scope', () => ({
  tryProjectScope: async () => harnessAccess.granted,
}))
vi.mock('@/shared/agent-kernel', () => ({
  getMastraInstance: () => ({
    getWorkflow: () => ({
      getWorkflowRunById: (...args: unknown[]) => getWorkflowRunById(...args),
      createRun: (...args: unknown[]) => createRun(...args),
    }),
  }),
}))

import { GET, POST } from '../route'

const RUN_ID = 'run-owner'
const PROJECT_ID = 'project-owner'

beforeEach(() => {
  resetHarness()
  getWorkflowRunById.mockReset()
  resume.mockReset()
  createRun.mockReset()
  createRun.mockResolvedValue({ resume })
    resume.mockResolvedValue({ status: 'success' })
  getWorkflowRunById.mockResolvedValue({
    status: MastraWorkflowStatus.Suspended,
    input: { projectId: PROJECT_ID },
  })
})

describe('POST /api/storyteller/workflow/resume', () => {
  it('rejects an anonymous caller', async () => {
    const res = await POST(
      routeRequest({
        method: HttpMethod.Post,
        body: { runId: RUN_ID, selectedOption: StorytellerWorkflowVerdict.Approve },
      })
    )
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED)
    expect(resume).not.toHaveBeenCalled()
  })

  it('returns 404 when the caller does not own the project', async () => {
    signIn(OTHER_TENANT_USER)
    harnessAccess.granted = false
    const res = await POST(
      routeRequest({
        method: HttpMethod.Post,
        body: { runId: RUN_ID, selectedOption: StorytellerWorkflowVerdict.Approve },
      })
    )
    expect(res.status).toBe(HttpStatus.NOT_FOUND)
    expect(resume).not.toHaveBeenCalled()
  })

  it('resumes when the owner matches the run input projectId', async () => {
    signIn(E2E_HARNESS_USER)
    harnessAccess.granted = true
    const res = await POST(
      routeRequest({
        method: HttpMethod.Post,
        body: { runId: RUN_ID, selectedOption: StorytellerWorkflowVerdict.Approve },
      })
    )
    expect(res.status).toBe(HttpStatus.OK)
    expect(resume).toHaveBeenCalled()
  })
})

describe('GET /api/storyteller/workflow/resume', () => {
  it('rejects an anonymous caller', async () => {
    const res = await GET(
      routeRequest({
        method: HttpMethod.Get,
        query: { [QueryParam.RunId]: RUN_ID },
        url: `https://harness.test/api/storyteller/workflow/resume?${QueryParam.RunId}=${RUN_ID}`,
      })
    )
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED)
  })
})
