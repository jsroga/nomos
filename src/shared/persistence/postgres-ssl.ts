import type { ConnectionOptions } from 'node:tls'
import { env } from '../config/env'
import { ENV_FLAG_OFF } from '../config/constants/env'
import { NodeEnv } from '../data/constants/protocol'
import { PostgresSslQueryParam } from './constants/postgres-ssl'
import { SUPABASE_PROD_CA_2021 } from './constants/supabase-prod-ca-2021'

const SSL_QUERY_PARAMS: readonly PostgresSslQueryParam[] = [
  PostgresSslQueryParam.SslMode,
  PostgresSslQueryParam.SslRootCert,
  PostgresSslQueryParam.SslCert,
  PostgresSslQueryParam.SslKey,
]

export function stripPostgresSslQueryParams(connectionString: string): string {
  const queryIndex = connectionString.indexOf('?')
  if (queryIndex === -1) return connectionString

  const params = new URLSearchParams(connectionString.slice(queryIndex + 1))
  for (const key of SSL_QUERY_PARAMS) {
    params.delete(key)
  }
  const next = params.toString()
  const base = connectionString.slice(0, queryIndex)
  return next === '' ? base : `${base}?${next}`
}

export function resolvePostgresSsl(input: {
  nodeEnv: string
  rejectUnauthorized: boolean
}): false | ConnectionOptions {
  if (input.nodeEnv === NodeEnv.Development) return false
  if (!input.rejectUnauthorized) return { rejectUnauthorized: false }
  return { rejectUnauthorized: true, ca: SUPABASE_PROD_CA_2021 }
}

export function postgresSsl(): false | ConnectionOptions {
  return resolvePostgresSsl({
    nodeEnv: process.env.NODE_ENV ?? NodeEnv.Development,
    rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED !== ENV_FLAG_OFF,
  })
}
