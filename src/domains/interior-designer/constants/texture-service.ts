export enum TextureServiceLog {
  NoOpenAiKey = '[TextureService] No OpenAI Key found, skipping refinement',
  RefinementFailed = '[TextureService] Refinement failed:',
}

export enum TextureServiceError {
  PromptRequired = 'Prompt is required',
  ApiKeyRequired = 'API Key is required',
}

export enum TextureServicePlaceholder {
  Url = 'placeholder_url',
}
