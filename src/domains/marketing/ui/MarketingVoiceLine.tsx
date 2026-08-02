import { LandingHeroCopy } from '@/domains/marketing/ui/LandingPage/constants/landing-copy'
import {
  VOICE_LINE_ALIGN_CLASS,
  VoiceLineAlign,
} from '@/domains/marketing/constants/voice-line'

type MarketingVoiceLineProps = {
  readonly className?: string
  readonly align?: VoiceLineAlign
}

/** Red editorial voice line — identical treatment on landing hero and login brand panel. */
export function MarketingVoiceLine({
  className = '',
  align = VoiceLineAlign.Center,
}: MarketingVoiceLineProps) {
  return (
    <div
      className={`flex items-center gap-[11px] ${VOICE_LINE_ALIGN_CLASS[align]} ${className}`.trim()}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ef4444] shadow-[0_0_14px_#ef4444]"
      />
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.34em] text-[#ef4444]">
        {LandingHeroCopy.VoiceLine}
      </p>
    </div>
  )
}
