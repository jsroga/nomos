import { describe, expect, it } from 'vitest'
import { HttpStatus } from '@/shared/data/constants/protocol'
import { ClientFetchError } from '@/shared/data/fetch-json-record'
import { isMissingProjectError } from '@/shared/workspace/utils/missing-project-error'

describe('isMissingProjectError', () => {
  it('treats 404 as a missing project', () => {
    expect(isMissingProjectError(new ClientFetchError('gone', HttpStatus.NOT_FOUND))).toBe(true)
  })

  it('does not treat 500 or network failures as missing', () => {
    expect(isMissingProjectError(new ClientFetchError('down', HttpStatus.INTERNAL))).toBe(false)
    expect(isMissingProjectError(new Error('getaddrinfo ENOTFOUND'))).toBe(false)
  })
})
