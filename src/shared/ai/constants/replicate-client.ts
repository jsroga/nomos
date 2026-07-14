export enum ReplicateClientLog {
  RawOutput = '[ReplicateClient] Raw output:',
  UnexpectedFormat = '[ReplicateClient] Unexpected output format:',
  FirstMaskType = '[ReplicateClient] First mask type:',
  FirstMaskKeys = '[ReplicateClient] First mask keys:',
  FirstMask = '[ReplicateClient] First mask:',
  TextureOutput = '[ReplicateClient] Texture output:',
}

export enum ReplicateTextureParam {
  NegativePrompt = 'text, watermark, low quality, blurred, distorted, perspective, shadows',
  Refine = 'expert_ensemble_refiner',
  Scheduler = 'K_EULER',
}
