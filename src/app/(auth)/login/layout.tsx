import { WORKSPACE_PAGE_TITLE } from '@/shared/data/constants/route-metadata'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: WORKSPACE_PAGE_TITLE.SIGN_IN,
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
