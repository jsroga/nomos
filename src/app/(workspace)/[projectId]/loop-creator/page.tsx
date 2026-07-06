import { LoopCreatorLayout } from '@/domains/loop-creator'

interface PageProps {
  params: Promise<{ projectId: string }>
}

export default async function LoopCreatorPage({ params }: PageProps) {
  const { projectId } = await params

  return <LoopCreatorLayout projectId={projectId} />
}
