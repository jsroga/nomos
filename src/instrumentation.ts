import * as Sentry from '@sentry/nextjs'
import {
  InstrumentationLog,
  MastraSerializationEnv,
  MastraSerializationLimit,
  OTEL_DEFAULT_SERVICE_NAME,
  OtelEnv,
} from '@/shared/observability/constants/instrumentation'
import { NextRuntime } from '@/shared/data/constants/protocol'

const sentryOptions = {
  dsn: 'https://5624b3a707f335df243772d343ae9f25@o4510956650627072.ingest.de.sentry.io/4510956652003408',
  tracesSampleRate: 1,
  enableLogs: true,
  sendDefaultPii: true,
} satisfies Sentry.NodeOptions

export async function register() {
  if (process.env.NEXT_RUNTIME === NextRuntime.NodeJs) {
    Sentry.init(sentryOptions)
  }

  if (process.env.NEXT_RUNTIME === NextRuntime.Edge) {
    Sentry.init(sentryOptions)
  }

  if (
    typeof globalThis.process === 'undefined' ||
    typeof globalThis.process.versions?.node === 'undefined'
  ) {
    return
  }

  try {
    process.env[MastraSerializationEnv.MaxAttrChars] = MastraSerializationLimit.MaxAttrChars
    process.env[MastraSerializationEnv.MaxDepth] = MastraSerializationLimit.MaxDepth
    process.env[MastraSerializationEnv.MaxKeys] = MastraSerializationLimit.MaxKeys
    process.env[MastraSerializationEnv.MaxArrayItems] = MastraSerializationLimit.MaxArrayItems
    process.env[MastraSerializationEnv.MaxTotalChars] = MastraSerializationLimit.MaxTotalChars

    console.log(InstrumentationLog.MastraConfigured)
  } catch (e) {
    console.warn(InstrumentationLog.MastraConfigureFailed, e)
  }

  try {
    const otelStart = performance.now()
    const { registerOTel } = await import('@vercel/otel')
    registerOTel({
      serviceName: process.env[OtelEnv.ServiceName] || OTEL_DEFAULT_SERVICE_NAME,
    })
    console.log(`${InstrumentationLog.OtelRegistered} ${(performance.now() - otelStart).toFixed(2)}ms`)
  } catch (err) {
    console.error(InstrumentationLog.OtelFailed, err)
  }

  // NOTE: the admin model-settings cache is NOT warmed here — importing it pulls
  // `pg` into the Edge instrumentation bundle (it uses Node's `util/types`). It
  // self-warms lazily in Node on the first resolver call (see model-settings.ts).
}

export const onRequestError = Sentry.captureRequestError
