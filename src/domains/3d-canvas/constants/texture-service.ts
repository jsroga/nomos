export enum TextureServiceLog {
  NoOpenRouterKey = '[TextureService] No OPENROUTER_API_KEY found, skipping refinement',
  RefinementFailed = '[TextureService] Refinement failed:',
}

export enum TextureServiceError {
  PromptRequired = 'Prompt is required',
  ApiKeyRequired = 'API Key is required',
}

export enum TextureServicePlaceholder {
  Url = 'placeholder_url',
}
