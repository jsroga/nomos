import { LoopCreatorLayout } from '@/domains/loop-creator'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

interface PageProps {
  params: Promise<{ projectId: string }>
}

export default async function LoopCreatorPage({ params }: PageProps) {
  const { projectId } = await params

  return <LoopCreatorLayout projectId={projectId} />
}
