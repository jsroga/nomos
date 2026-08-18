import { ListOrdered, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { EpisodePremise } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { EpisodePremiseSectionKey } from '../constants/ozymandias-sections'
import { cn } from '@/shared/data/utils'
import { RichText } from '../../RichText'

interface TenPointsPlanSectionProps {
  tenPointsPlan: EpisodePremise['tenPointsPlan'] | undefined
  isEditing: boolean
  isGenerating: boolean
  generatingSection: string | null
  projectId: string
  onGenerateSection?: (section: EpisodePremiseSectionKey) => void
  onChange: (plan: EpisodePremise['tenPointsPlan']) => void
}

function TenPointsSkeleton() {
  return (
    <div className="space-y-3 p-4 bg-card border border-border rounded-md">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-6 w-6 rounded-md flex-shrink-0" />
          <Skeleton className="h-4 flex-1 rounded-md" />
        </div>
      ))}
    </div>
  )
}

function TenPointsEditor({
  tenPointsPlan,
  onChange,
}: {
  tenPointsPlan: EpisodePremise['tenPointsPlan'] | undefined
  onChange: (plan: EpisodePremise['tenPointsPlan']) => void
}) {
  const plan = tenPointsPlan || []

  return (
    <div className="space-y-3 p-4 bg-muted/30 border border-border rounded-md">
      {plan.map((point, index) => (
        <div key={index} className="flex gap-3 items-start">
          <div className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-mono text-xs font-medium">
            {index + 1}
          </div>
          <textarea
            className="flex-1 p-3 bg-background border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none min-h-[56px]"
            value={typeof point === 'object' ? JSON.stringify(point) : String(point)}
            onChange={e => {
              const newPlan = [...plan]
              newPlan[index] = e.target.value
              onChange(newPlan)
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-md text-muted-foreground hover:text-destructive flex-shrink-0"
            onClick={() => {
              const newPlan = [...plan]
              newPlan.splice(index, 1)
              onChange(newPlan)
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 rounded-md border-dashed text-xs"
        onClick={() => onChange([...plan, ''])}
      >
        <Plus className="w-3.5 h-3.5" /> Add Step
      </Button>
    </div>
  )
}

function TenPointReadRow({
  point,
  index,
  projectId,
}: {
  point: NonNullable<EpisodePremise['tenPointsPlan']>[number]
  index: number
  projectId: string
}) {
  return (
    <div className="flex gap-4 group items-start">
      <div className="flex-shrink-0 w-7 h-7 rounded-md bg-muted border border-border flex items-center justify-center text-muted-foreground font-mono text-xs font-medium group-hover:border-primary group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        {typeof point === 'object' && point !== null ? (
          Object.entries(point).map(([k, v]) => (
            <div key={k} className="mb-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mr-2">
                {k}:
              </span>
              <RichText
                text={String(v)}
                projectId={projectId}
                markdown
                className="text-foreground text-sm leading-relaxed"
              />
            </div>
          ))
        ) : (
          <RichText
            text={String(point)}
            projectId={projectId}
            markdown
            className="text-foreground text-sm leading-relaxed"
          />
        )}
      </div>
    </div>
  )
}

function TenPointsReadView({
  tenPointsPlan,
  projectId,
}: {
  tenPointsPlan: NonNullable<EpisodePremise['tenPointsPlan']>
  projectId: string
}) {
  return (
    <div className="space-y-2 p-4 bg-card border border-border rounded-md">
      {tenPointsPlan.map((point, index) => (
        <TenPointReadRow key={index} point={point} index={index} projectId={projectId} />
      ))}
    </div>
  )
}

function TenPointsEmptyState({
  onGenerateSection,
  disabled,
}: {
  onGenerateSection?: (section: EpisodePremiseSectionKey) => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      className="w-full p-8 bg-card border border-dashed border-border rounded-md flex flex-col items-center justify-center min-h-[180px] hover:border-primary/50 hover:bg-muted/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
      onClick={() => onGenerateSection?.(EpisodePremiseSectionKey.TenPointsPlan)}
      disabled={disabled}
    >
      <ListOrdered className="w-10 h-10 text-muted-foreground mb-3" />
      <h3 className="font-mono text-sm font-semibold tracking-tight mb-1">No 10-Point Plan</h3>
      <p className="text-xs text-muted-foreground text-center max-w-sm leading-relaxed">
        Generate a high-level outline before breaking it down into beats.
      </p>
      <span className="mt-4 text-xs text-primary font-medium">Generate Plan</span>
    </button>
  )
}

export function TenPointsPlanSection({
  tenPointsPlan,
  isEditing,
  isGenerating,
  generatingSection,
  projectId,
  onGenerateSection,
  onChange,
}: TenPointsPlanSectionProps) {
  const isGeneratingPlan = generatingSection === EpisodePremiseSectionKey.TenPointsPlan
  const hasPlan = Boolean(tenPointsPlan && tenPointsPlan.length > 0)

  return (
    <div className="mt-8 mb-10 w-full">
      <div className="flex items-center justify-between mb-3 w-full">
        <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-primary flex items-center gap-2">
          <ListOrdered className="w-4 h-4" /> 10-Point Episode Plan
        </span>
        {!isEditing && onGenerateSection && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-2 rounded-md text-muted-foreground hover:text-primary text-xs"
            onClick={() => onGenerateSection(EpisodePremiseSectionKey.TenPointsPlan)}
            disabled={isGenerating}
          >
            <RefreshCw className={cn(isGeneratingPlan && 'animate-spin', 'w-3.5 h-3.5')} />
            {hasPlan ? 'Regenerate' : 'Generate'}
          </Button>
        )}
      </div>

      {isGeneratingPlan ? (
        <TenPointsSkeleton />
      ) : isEditing ? (
        <TenPointsEditor tenPointsPlan={tenPointsPlan} onChange={onChange} />
      ) : hasPlan && tenPointsPlan ? (
        <TenPointsReadView tenPointsPlan={tenPointsPlan} projectId={projectId} />
      ) : (
        <TenPointsEmptyState onGenerateSection={onGenerateSection} disabled={isGenerating} />
      )}
    </div>
  )
}
