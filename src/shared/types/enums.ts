export enum AIProvider {
  OpenAI = 'openai',
  Gemini = 'gemini',
  NanoBanana = 'nano-banana',
  Stability = 'stability',
  Replicate = 'replicate',
  Fal = 'fal',
  Hyper3D = 'hyper3d',
  Meshy = 'meshy',
  Custom = 'custom',
  Mock = 'mock',
}

export enum EditorTool {
  None = 'none',
  Eraser = 'eraser',
  Inpaint = 'inpaint',
}

export enum JobStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

export enum JobType {
  GenerateTile = 'generate-tile',
  UpscaleTile = 'upscale-tile',
  RepaintTile = 'repaint-tile',
  Generate3D = 'generate-3d',
}

