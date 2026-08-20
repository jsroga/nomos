import {
  LoopbackHostname,
  PublicHttpUrlProtocol,
} from '@/shared/data/constants/public-http-url'

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === LoopbackHostname.Localhost ||
    hostname === LoopbackHostname.Ipv4 ||
    hostname === LoopbackHostname.Ipv6 ||
    hostname === LoopbackHostname.Ipv6Bracketed
  )
}

export function isPublicHttpUrl(value: string): boolean {
  if (!value) return false
  try {
    const parsed = new URL(value)
    if (
      parsed.protocol !== PublicHttpUrlProtocol.Http &&
      parsed.protocol !== PublicHttpUrlProtocol.Https
    ) {
      return false
    }
    return !isLoopbackHostname(parsed.hostname)
  } catch {
    return false
  }
}
