import { ReferenceText } from '../../ReferenceText'

interface EpisodeRefTextProps {
  text: string
  projectId?: string
  className?: string
}

export function EpisodeRefText({ text, projectId, className }: EpisodeRefTextProps) {
  if (projectId) {
    return <ReferenceText text={text} projectId={projectId} className={className} inline />
  }
  return <span className={className}>{text}</span>
}
