import { Github } from 'lucide-react'
import { LandingExternalUrl } from '@/domains/marketing/ui/LandingPage/constants/landing-copy'
import {
  LandingExternalLinkAttr,
  LandingNavUiCopy,
} from '@/domains/marketing/ui/LandingPage/constants/landing-ui-copy'

type LandingGitHubLinkProps = {
  className: string
  onClick?: () => void
  showLabel?: boolean
}

export function LandingGitHubLink({
  className,
  onClick,
  showLabel = false,
}: LandingGitHubLinkProps) {
  return (
    <a
      href={LandingExternalUrl.GitHubRepo}
      target={LandingExternalLinkAttr.TargetBlank}
      rel={LandingExternalLinkAttr.RelNoopener}
      aria-label={LandingNavUiCopy.GitHub}
      onClick={onClick}
      className={className}
    >
      <Github className="h-4 w-4" aria-hidden />
      {showLabel ? LandingNavUiCopy.GitHub : null}
    </a>
  )
}
