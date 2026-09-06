import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  E2E_HARNESS_USER,
  OTHER_TENANT_USER,
  authModuleStub,
  projectAccessStub,
  resetHarness,
  routeParams,
  routeRequest,
  signIn,
} from '@/app/api/route-harness'
import { AppModuleId, HttpMethod, HttpStatus, QueryParam } from '@/shared/data/constants/protocol'
import {
  ChatSessionBodyKey,
  ChatSessionCopy,
  ChatSessionStatus,
  ChatSessionWire,
} from '@/shared/chat/core/constants/chat-session'
import { overlayMemoryRef } from '@/shared/agent-kernel/mastra/memory-ref'
import type { ChatSession } from '@/shared/chat/core/io/chat-session-contract'

const PROJECT_ID = '11111111-1111-4111-8111-111111111111'
const SESSION_ID = '22222222-2222-4222-8222-222222222222'

const listOwnedChatSessions = vi.fn()
const insertChatSession = vi.fn()
const findOwnedChatSession = vi.fn()
const updateOwnedChatSession = vi.fn()
const deleteOwnedChatSession = vi.fn()
const deleteThread = vi.fn()
const listMessages = vi.fn()

vi.mock('@/shared/auth/auth', async () => authModuleStub())
vi.mock('@/shared/auth/project-access', async () => projectAccessStub())
vi.mock('@/shared/chat/core/io/chat-session-store', () => ({
  listOwnedChatSessions: (...args: unknown[]) => listOwnedChatSessions(...args),
  insertChatSession: (...args: unknown[]) => insertChatSession(...args),
  findOwnedChatSession: (...args: unknown[]) => findOwnedChatSession(...args),
  updateOwnedChatSession: (...args: unknown[]) => updateOwnedChatSession(...args),
  deleteOwnedChatSession: (...args: unknown[]) => deleteOwnedChatSession(...args),
}))
vi.mock('@/shared/agent-kernel/mastra-instance', () => ({
  getStorageInstance: () => ({
    getStore: async () => ({
      deleteThread: (...args: unknown[]) => deleteThread(...args),
      listMessages: (...args: unknown[]) => listMessages(...args),
    }),
  }),
}))

import { GET as listGet, POST as createPost } from '../route'
import { DELETE, GET as getById, PATCH } from '../[id]/route'
import { GET as getMessages } from '../[id]/messages/route'

function sessionRow(overrides: Partial<ChatSession> = {}): ChatSession {
  const bound = overlayMemoryRef({ id: SESSION_ID, userId: E2E_HARNESS_USER })
  return {
    id: SESSION_ID,
    projectId: PROJECT_ID,
    userId: E2E_HARNESS_USER,
    moduleId: AppModuleId.Storyteller,
    thread: bound.thread,
    resource: bound.resource,
    title: ChatSessionCopy.PlaceholderTitle,
    titleLocked: false,
    status: ChatSessionStatus.Idle,
    runId: null,
    wire: ChatSessionWire.AiSdk,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  resetHarness()
  listOwnedChatSessions.mockReset()
  insertChatSession.mockReset()
  findOwnedChatSession.mockReset()
  updateOwnedChatSession.mockReset()
  deleteOwnedChatSession.mockReset()
  deleteThread.mockReset()
  listMessages.mockReset()
})

describe('GET /api/chat/sessions', () => {
  it('lists this user and project newest first', async () => {
    signIn(E2E_HARNESS_USER)
    const rows = [sessionRow(), sessionRow({ id: '33333333-3333-4333-8333-333333333333' })]
    listOwnedChatSessions.mockResolvedValue(rows)
    const res = await listGet(
      routeRequest({ method: HttpMethod.Get, query: { [QueryParam.ProjectId]: PROJECT_ID } }),
    )
    expect(res.status).toBe(HttpStatus.OK)
    expect(listOwnedChatSessions).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      userId: E2E_HARNESS_USER,
    })
    expect(await res.json()).toEqual(rows)
  })
})

describe('POST /api/chat/sessions', () => {
  it('creates a host row with overlay thread, placeholder, idle, and aiSdk', async () => {
    signIn(E2E_HARNESS_USER)
    insertChatSession.mockImplementation(async (input: {
      id: string
      projectId: string
      userId: string
      moduleId: AppModuleId
    }) => sessionRow({ id: input.id, moduleId: input.moduleId, ...overlayMemoryRef({ id: input.id, userId: input.userId }) }))
    const res = await createPost(
      routeRequest({
        method: HttpMethod.Post,
        body: {
          [ChatSessionBodyKey.ProjectId]: PROJECT_ID,
          [ChatSessionBodyKey.ModuleId]: AppModuleId.Storyteller,
        },
      }),
    )
    expect(res.status).toBe(HttpStatus.CREATED)
    expect(insertChatSession).toHaveBeenCalledTimes(1)
    const created = await res.json()
    expect(created.moduleId).toBe(AppModuleId.Storyteller)
    expect(created.wire).toBe(ChatSessionWire.AiSdk)
    expect(created.status).toBe(ChatSessionStatus.Idle)
    expect(created.title).toBe(ChatSessionCopy.PlaceholderTitle)
    expect(created.thread).toBe(`overlay:${created.id}`)
    expect(created.resource).toBe(E2E_HARNESS_USER)
  })

  it('sets moduleId once at create', async () => {
    signIn(E2E_HARNESS_USER)
    insertChatSession.mockResolvedValue(sessionRow())
    await createPost(
      routeRequest({
        method: HttpMethod.Post,
        body: {
          [ChatSessionBodyKey.ProjectId]: PROJECT_ID,
          [ChatSessionBodyKey.ModuleId]: AppModuleId.LoopCreator,
        },
      }),
    )
    expect(insertChatSession.mock.calls[0]?.[0]).toMatchObject({
      moduleId: AppModuleId.LoopCreator,
      projectId: PROJECT_ID,
      userId: E2E_HARNESS_USER,
    })
  })
})

describe('PATCH /api/chat/sessions/{id}', () => {
  it('locks title when renaming', async () => {
    signIn(E2E_HARNESS_USER)
    findOwnedChatSession.mockResolvedValue(sessionRow())
    updateOwnedChatSession.mockResolvedValue(
      sessionRow({ title: 'Locked name', titleLocked: true }),
    )
    const res = await PATCH(
      routeRequest({
        method: HttpMethod.Patch,
        body: { [ChatSessionBodyKey.Title]: 'Locked name' },
      }),
      routeParams({ id: SESSION_ID }),
    )
    expect(res.status).toBe(HttpStatus.OK)
    expect(updateOwnedChatSession).toHaveBeenCalledWith({
      id: SESSION_ID,
      userId: E2E_HARNESS_USER,
      patch: { title: 'Locked name' },
    })
    const json = await res.json()
    expect(json.titleLocked).toBe(true)
  })

  it('rejects moduleId on PATCH', async () => {
    signIn(E2E_HARNESS_USER)
    const res = await PATCH(
      routeRequest({
        method: HttpMethod.Patch,
        body: { [ChatSessionBodyKey.ModuleId]: AppModuleId.LoopCreator },
      }),
      routeParams({ id: SESSION_ID }),
    )
    expect(res.status).toBe(HttpStatus.BAD_REQUEST)
    expect(updateOwnedChatSession).not.toHaveBeenCalled()
  })

  it('returns 404 for another user, not 403', async () => {
    signIn(OTHER_TENANT_USER)
    updateOwnedChatSession.mockResolvedValue(null)
    findOwnedChatSession.mockResolvedValue(null)
    const res = await PATCH(
      routeRequest({
        method: HttpMethod.Patch,
        body: { [ChatSessionBodyKey.Title]: 'stolen' },
      }),
      routeParams({ id: SESSION_ID }),
    )
    expect(res.status).toBe(HttpStatus.NOT_FOUND)
    expect(res.status).not.toBe(HttpStatus.FORBIDDEN)
  })
})

describe('DELETE /api/chat/sessions/{id}', () => {
  it('returns 204 and deletes only that session', async () => {
    signIn(E2E_HARNESS_USER)
    findOwnedChatSession.mockResolvedValue(sessionRow())
    deleteOwnedChatSession.mockResolvedValue(true)
    const res = await DELETE(routeRequest({ method: HttpMethod.Delete }), routeParams({ id: SESSION_ID }))
    expect(res.status).toBe(HttpStatus.NO_CONTENT)
    expect(deleteOwnedChatSession).toHaveBeenCalledWith({
      id: SESSION_ID,
      userId: E2E_HARNESS_USER,
    })
  })

  it('returns 404 for another user, not 403', async () => {
    signIn(OTHER_TENANT_USER)
    deleteOwnedChatSession.mockResolvedValue(false)
    const res = await DELETE(routeRequest({ method: HttpMethod.Delete }), routeParams({ id: SESSION_ID }))
    expect(res.status).toBe(HttpStatus.NOT_FOUND)
    expect(res.status).not.toBe(HttpStatus.FORBIDDEN)
  })
})

describe('GET /api/chat/sessions/{id}', () => {
  it('returns 404 for another user', async () => {
    signIn(OTHER_TENANT_USER)
    findOwnedChatSession.mockResolvedValue(null)
    const res = await getById(routeRequest({ method: HttpMethod.Get }), routeParams({ id: SESSION_ID }))
    expect(res.status).toBe(HttpStatus.NOT_FOUND)
  })
})

describe('GET /api/chat/sessions/{id}/messages', () => {
  it('returns 404 for another user', async () => {
    signIn(OTHER_TENANT_USER)
    findOwnedChatSession.mockResolvedValue(null)
    const res = await getMessages(routeRequest({ method: HttpMethod.Get }), routeParams({ id: SESSION_ID }))
    expect(res.status).toBe(HttpStatus.NOT_FOUND)
  })
})
