/** Voice line layout alignment for marketing hero / login brand panel. */

export enum VoiceLineAlign {
  Center = 'center',
  Start = 'start',
}

export const VOICE_LINE_ALIGN_CLASS: Record<VoiceLineAlign, string> = {
  [VoiceLineAlign.Center]: 'justify-center',
  [VoiceLineAlign.Start]: 'justify-start',
}
