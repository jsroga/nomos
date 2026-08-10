import { GameHubDashboard } from '@/components/shell/GameHubDashboard'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

export default async function ProjectRootPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  return <GameHubDashboard projectId={projectId} />
}
