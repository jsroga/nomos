import { PuzzleDesignerLayout } from '@/domains/deduction-puzzle-designer'

interface PageProps {
  params: Promise<{ projectId: string }>
}

export default async function DeductionPuzzlePage({ params }: PageProps) {
  const { projectId } = await params

  return <PuzzleDesignerLayout />
}
