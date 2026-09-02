import { beforeEach, describe, expect, it, vi } from 'vitest'

const verifyProjectAccessMock = vi.fn()
vi.mock('@/shared/auth/project-access', () => ({
  verifyProjectAccess: (...args: unknown[]) => verifyProjectAccessMock(...args),
}))

import {
  ProjectForbidden,
  SYSTEM_USER_ID,
  SystemScopeReason,
  projectScope,
  systemScope,
  type ProjectScope,
} from '@/shared/auth/project-scope'

const PROJECT = '22222222-2222-4222-8222-222222222222'
const OWNER = '11111111-1111-4111-8111-111111111111'

beforeEach(() => {
  verifyProjectAccessMock.mockReset()
})

describe('projectScope', () => {
  it('returns a scope when the user owns the project', async () => {
    verifyProjectAccessMock.mockResolvedValue(true)
    const scope = await projectScope(PROJECT, OWNER)
    expect(scope.projectId).toBe(PROJECT)
    expect(scope.userId).toBe(OWNER)
  })

  it('throws when the user does not own the project', async () => {
    verifyProjectAccessMock.mockResolvedValue(false)
    await expect(projectScope(PROJECT, OWNER)).rejects.toBeInstanceOf(ProjectForbidden)
  })

  it('delegates the check rather than reimplementing it', async () => {
    verifyProjectAccessMock.mockResolvedValue(true)
    await projectScope(PROJECT, OWNER)
    expect(verifyProjectAccessMock).toHaveBeenCalledWith(PROJECT, OWNER)
  })

  it('produces a frozen scope — it cannot be repointed after the check', async () => {
    verifyProjectAccessMock.mockResolvedValue(true)
    const scope = await projectScope(PROJECT, OWNER)
    expect(Object.isFrozen(scope)).toBe(true)
  })
})

describe('systemScope', () => {
  it('requires a stated reason and logs it', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const scope = systemScope(PROJECT, SystemScopeReason.TaskPersistence)

    expect(scope.projectId).toBe(PROJECT)
    expect(scope.userId).toBe(SYSTEM_USER_ID)
    expect(info).toHaveBeenCalled()
    expect(String(info.mock.calls[0][0])).toContain(SystemScopeReason.TaskPersistence)
    info.mockRestore()
  })

  it('does not consult project access — there is no user to check', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    systemScope(PROJECT, SystemScopeReason.ProviderSmoke)
    expect(verifyProjectAccessMock).not.toHaveBeenCalled()
  })
})

describe('the brand', () => {
  it('cannot be forged from an object literal', () => {
    // The guarantee is compile-time, so this is a type-level assertion: the
    // line below must not type-check. If the brand is ever weakened to a plain
    // structural type, @ts-expect-error becomes unused and tsc fails here —
    // which is exactly the alarm we want.
    // @ts-expect-error a bare pair of ids is not proof of ownership
    const forged: ProjectScope = { projectId: PROJECT, userId: OWNER }
    expect(forged.projectId).toBe(PROJECT)
  })
})
