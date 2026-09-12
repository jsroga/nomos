import { notFound } from 'next/navigation'
import { InteriorDesignerWorkspace } from '@/domains/3d-canvas'
import { is3dCanvasEnabled } from '@/shared/data/feature-flags'

export default function InteriorDesignerPage() {
  if (!is3dCanvasEnabled()) notFound()
  return <InteriorDesignerWorkspace />
}
