import { WORKSPACE_PAGE_TITLE } from '@/shared/data/constants/route-metadata'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: WORKSPACE_PAGE_TITLE.ASSET_EXPORTER,
}

export default function AssetExporterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
