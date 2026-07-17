import {
  BlockedHost,
  HostSuffix,
  SsrfBlockReason,
  UrlProtocolWithColon,
} from '@/shared/auth/constants/security'

export function isAllowedProtocol(protocol: string): boolean {
  return protocol === UrlProtocolWithColon.Http || protocol === UrlProtocolWithColon.Https
}

export function isLocalHostname(hostname: string): boolean {
  return (
    hostname === BlockedHost.Localhost ||
    hostname === BlockedHost.LoopbackV4 ||
    hostname === BlockedHost.LoopbackV6 ||
    hostname === BlockedHost.Unspecified
  )
}

export function privateIpv4BlockReason(hostname: string): string | null {
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
  if (!ipv4Pattern.test(hostname)) return null

  const octets = hostname.split('.').map(Number)
  if (octets[0] === 10) return SsrfBlockReason.PrivateIpBlocked
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
    return SsrfBlockReason.PrivateIpBlocked
  }
  if (octets[0] === 192 && octets[1] === 168) return SsrfBlockReason.PrivateIpBlocked
  if (octets[0] === 169 && octets[1] === 254) return SsrfBlockReason.LinkLocalBlocked
  return null
}

export function isCloudMetadataHostname(hostname: string): boolean {
  return (
    hostname === BlockedHost.AwsMetadata ||
    hostname === BlockedHost.GoogleMetadata ||
    hostname.endsWith(HostSuffix.Internal)
  )
}
