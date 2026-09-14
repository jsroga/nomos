import { describe, expect, it } from 'vitest'
import { NodeEnv } from '@/shared/data/constants/protocol'
import { SUPABASE_PROD_CA_2021 } from '@/shared/persistence/constants/supabase-prod-ca-2021'
import {
  resolvePostgresSsl,
  stripPostgresSslQueryParams,
} from '@/shared/persistence/postgres-ssl'

const POOLER = 'postgresql://postgres.ref:secret@aws-1-eu-central-1.pooler.supabase.com:6543/postgres'

describe('stripPostgresSslQueryParams', () => {
  it('leaves a URL without a query unchanged', () => {
    expect(stripPostgresSslQueryParams(POOLER)).toBe(POOLER)
  })

  it('drops sslmode so node-postgres cannot replace the Pool ssl object', () => {
    expect(stripPostgresSslQueryParams(`${POOLER}?sslmode=require`)).toBe(POOLER)
  })

  it('keeps unrelated query keys', () => {
    expect(stripPostgresSslQueryParams(`${POOLER}?sslmode=require&application_name=nomos`)).toBe(
      `${POOLER}?application_name=nomos`,
    )
  })
})

describe('resolvePostgresSsl', () => {
  it('turns TLS off in local next dev', () => {
    expect(
      resolvePostgresSsl({ nodeEnv: NodeEnv.Development, rejectUnauthorized: true }),
    ).toBe(false)
  })

  it('pins the Supabase root CA when verification is on', () => {
    expect(
      resolvePostgresSsl({ nodeEnv: NodeEnv.Production, rejectUnauthorized: true }),
    ).toEqual({ rejectUnauthorized: true, ca: SUPABASE_PROD_CA_2021 })
  })

  it('skips peer verify when a local proxy injects a certificate', () => {
    expect(
      resolvePostgresSsl({ nodeEnv: NodeEnv.Production, rejectUnauthorized: false }),
    ).toEqual({ rejectUnauthorized: false })
  })
})
