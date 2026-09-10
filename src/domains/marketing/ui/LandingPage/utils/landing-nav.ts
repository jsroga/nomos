import {
  LandingExternalUrl,
  LandingNavItem,
  LandingScrollBehavior,
  LandingSectionId,
} from '@/domains/marketing/ui/LandingPage/constants/landing-copy'

export function handleLandingNavSelect(item: string): void {
  if (item === LandingNavItem.Api) {
    window.location.href = LandingExternalUrl.ApiDocs
    return
  }
  const el = document.getElementById(LandingSectionId.Systems)
  if (el) el.scrollIntoView({ behavior: LandingScrollBehavior.Smooth })
}
