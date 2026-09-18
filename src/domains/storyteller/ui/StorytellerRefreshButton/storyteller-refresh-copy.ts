export enum StorytellerRefreshCopy {
  Busy = 'Can\'t regenerate while something is generating',
  Generate = 'Generate',
  GenerateTwists = 'Generate Twists',
  RegeneratePrefix = 'Regenerate ',
  GeneratePlan = 'Generate 10-Point Episode Plan',
  RegeneratePlan = 'Regenerate 10-Point Episode Plan',
}

export enum StorytellerRefreshClass {
  Trigger = 'inline-flex pointer-events-auto',
  Button = 'h-7 w-7 rounded-lg text-muted-foreground hover:text-white hover:bg-white/15',
  Spin = 'animate-spin',
}

export function storytellerRegenerateLabel(section: string): string {
  return `${StorytellerRefreshCopy.RegeneratePrefix}${section}`
}
