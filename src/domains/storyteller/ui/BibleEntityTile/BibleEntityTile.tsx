import type { FC, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card'
import { cn } from '@/shared/data/utils'
import { RichText } from '../RichText'
import { BibleEntityTileClass } from './constants/bible-entity-tile'

function tileText(value: ReactNode, projectId?: string): ReactNode {
  if (typeof value !== 'string') return value
  return <RichText text={value} projectId={projectId} inline />
}

export const BibleEntityTile: FC<{
  title: ReactNode
  eyebrow?: ReactNode
  description?: ReactNode
  meta?: ReactNode
  trailing?: ReactNode
  children?: ReactNode
  projectId?: string
  className?: string
}> = ({ title, eyebrow, description, meta, trailing, children, projectId, className }) => (
  <Card className={cn(BibleEntityTileClass.Surface, className)}>
    <CardHeader className={BibleEntityTileClass.Header}>
      {eyebrow}
      <div className={BibleEntityTileClass.HeaderRow}>
        <CardTitle className={BibleEntityTileClass.Title}>{tileText(title, projectId)}</CardTitle>
        {trailing}
      </div>
      {description ? (
        <p className={BibleEntityTileClass.Description}>{tileText(description, projectId)}</p>
      ) : null}
      {meta}
    </CardHeader>
    {children ? (
      <CardContent className={BibleEntityTileClass.Content}>{children}</CardContent>
    ) : null}
  </Card>
)
