import { describe, expect, it } from 'vitest'
import { NextResponse } from 'next/server'
import { ProjectForbidden } from '@/shared/auth/project-scope'
import { HttpStatus } from '@/shared/data/constants/protocol'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { toProjectNotFound } from '../project-scope-response'

describe('toProjectNotFound', () => {
  it('answers a forbidden project with 404, never 403', async () => {
    const response = toProjectNotFound(new ProjectForbidden())

    expect(response).toBeInstanceOf(NextResponse)
    expect(response.status).toBe(HttpStatus.NOT_FOUND)
    await expect(response.json()).resolves.toEqual({ error: API_ERROR.PROJECT_NOT_FOUND })
  })

  it('rethrows anything else, so a real fault is not reported as a missing project', () => {
    const fault = new Error('connection reset')

    expect(() => toProjectNotFound(fault)).toThrow(fault)
  })

  it('rethrows a non-Error rejection rather than swallowing it', () => {
    expect(() => toProjectNotFound('nope')).toThrow()
  })
})
