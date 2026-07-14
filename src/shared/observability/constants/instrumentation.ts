import { NextRuntime } from '@/shared/data/constants/protocol'

export enum MastraSerializationEnv {
  MaxAttrChars = 'MASTRA_SERIALIZATION_MAX_ATTR_CHARS',
  MaxDepth = 'MASTRA_SERIALIZATION_MAX_DEPTH',
  MaxKeys = 'MASTRA_SERIALIZATION_MAX_KEYS',
  MaxArrayItems = 'MASTRA_SERIALIZATION_MAX_ARRAY_ITEMS',
  MaxTotalChars = 'MASTRA_SERIALIZATION_MAX_TOTAL_CHARS',
}

export enum MastraSerializationLimit {
  MaxAttrChars = '100000',
  MaxDepth = '20',
  MaxKeys = '500',
  MaxArrayItems = '500',
  MaxTotalChars = '1000000',
}

export enum InstrumentationLog {
  MastraConfigured = '✅ Mastra serialization limits configured via env (no truncation)',
  MastraConfigureFailed = '⚠️ Could not configure Mastra serialization limits:',
  OtelRegistered = '✅ OpenTelemetry Registered in',
  OtelFailed = '❌ Failed to register OpenTelemetry:',
}

export enum OtelEnv {
  ServiceName = 'OTEL_SERVICE_NAME',
}

export const OTEL_DEFAULT_SERVICE_NAME = 'tilemap-storyteller'

export const SENTRY_RUNTIME_CHECK = NextRuntime
