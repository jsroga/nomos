import { GameHubDashboard } from '@/components/shell/GameHubDashboard'

export default async function ProjectRootPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  return <GameHubDashboard projectId={projectId} />
}
