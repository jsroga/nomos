/** Catalog and OpenRouter ids for the only chat model e2e/smoke may call. */
export enum E2ePinnedChatModel {
  CatalogId = 'zai-coding-plan:glm-5.2',
  OpenRouterId = 'z-ai/glm-5.2',
  GatewayId = 'openrouter/z-ai/glm-5.2',
}

export enum E2eOpenRouterGateway {
  Prefix = 'openrouter/',
}

/** Substrings that must never reach a provider during an e2e/smoke request. */
export enum E2eBannedModelNeedle {
  Gpt56Sol = 'gpt-5.6-sol',
  KimiSlash = 'moonshotai/kimi',
  KimiK = 'kimi-k',
}

export enum E2eLlmPinError {
  JudgingForbidden = 'E2E LLM pin: live judges are forbidden; scoring is npm run eval',
}

export enum E2eHarnessEmail {
  Prefix = 'e2e-',
  Suffix = '@example.com',
}
