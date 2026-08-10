import { FsDirectory, NodeEnv } from '@/shared/data/constants/protocol'

export { FsDirectory, NodeEnv }

export enum PathTraversalToken {
  Parent = '..',
}

export enum UrlProtocolWithColon {
  Http = 'http:',
  Https = 'https:',
}

export enum SecurityValidationMessage {
  InvalidInput = 'Invalid input',
  PathTraversalDetected = 'Path traversal detected',
  PathTraversalAfterNormalization = 'Path traversal detected after normalization',
  PathEscapesAllowedDirectory = 'Path escapes allowed directory',
}

export enum ExternalAllowedDomain {
  ApiMeshy = 'api.meshy.ai',
  AssetsMeshy = 'assets.meshy.ai',
  CdnMeshy = 'cdn.meshy.ai',
  ApiHyper3d = 'api.hyper3d.ai',
  ApiOpenAi = 'api.openai.com',
  GoogleGenerativeLanguage = 'generativelanguage.googleapis.com',
  ApiStability = 'api.stability.ai',
  ApiReplicate = 'api.replicate.com',
  ApiCometApi = 'api.cometapi.com',
  ApiApiframe = 'api.apiframe.ai',
  CdnApiframe = 'cdn.apiframe.ai',
  Cdn2Apiframe = 'cdn2.apiframe.ai',
  FalRun = 'fal.run',
  QueueFalRun = 'queue.fal.run',
  GoogleStorage = 'storage.googleapis.com',
  Supabase = 'supabase.co',
  BlobVercelStorage = 'blob.vercel-storage.com',
  PublicBlobVercelStorage = 'public.blob.vercel-storage.com',
}

export const ALLOWED_EXTERNAL_DOMAINS: readonly string[] = Object.values(ExternalAllowedDomain)

export enum BlockedHost {
  Localhost = 'localhost',
  LoopbackV4 = '127.0.0.1',
  LoopbackV6 = '::1',
  Unspecified = '0.0.0.0',
  AwsMetadata = '169.254.169.254',
  GoogleMetadata = 'metadata.google.internal',
}

export enum HostSuffix {
  Internal = '.internal',
}

export enum SsrfBlockReason {
  InvalidProtocol = 'Invalid protocol - only HTTP/HTTPS allowed',
  LocalhostBlocked = 'Localhost access blocked',
  PrivateIpBlocked = 'Private IP range blocked',
  LinkLocalBlocked = 'Link-local IP blocked',
  CloudMetadataBlocked = 'Cloud metadata endpoint blocked',
  InvalidUrlFormat = 'Invalid URL format',
}

export enum SensitiveLogKey {
  Password = 'password',
  ApiKey = 'apiKey',
  ApiKeySnake = 'api_key',
  ApiKeyCompact = 'apikey',
  Secret = 'secret',
  Token = 'token',
  Authorization = 'authorization',
  Auth = 'auth',
  Credential = 'credential',
  Private = 'private',
  AccessToken = 'accessToken',
  AccessTokenSnake = 'access_token',
  RefreshToken = 'refreshToken',
  RefreshTokenSnake = 'refresh_token',
  SessionToken = 'sessionToken',
  SessionTokenSnake = 'session_token',
  Jwt = 'jwt',
  Bearer = 'bearer',
}

export const SENSITIVE_LOG_KEYS: readonly string[] = Object.values(SensitiveLogKey)

export enum SecureLogRedaction {
  MaxDepth = '[MAX_DEPTH]',
  Redacted = '[REDACTED]',
}

export enum SsrfErrorPrefix {
  Protection = 'SSRF Protection: ',
}
