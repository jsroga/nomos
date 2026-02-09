import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Asset Exporter',
}

export default function AssetExporterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
