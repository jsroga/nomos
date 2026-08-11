import { RefreshCw } from 'lucide-react'
import { EpisodePremise } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { cn } from '@/shared/data/utils'
import { ReferenceText } from '../../ReferenceText'
import {
  EpisodePremiseSectionKey,
  OzymandiasFieldKey,
  OzymandiasSectionConfig,
  ozymandiasBorderClass,
  ozymandiasDashedClass,
  ozymandiasEditClass,
  ozymandiasEmptyIconClass,
  ozymandiasHoverClass,
  ozymandiasLabelClass,
  ozymandiasSkeletonClass,
} from '../constants/ozymandias-sections'

type PremiseSectionKey = EpisodePremiseSectionKey

interface OzymandiasSectionProps {
  config: OzymandiasSectionConfig
  value: string | undefined
  isEditing: boolean
  isGenerating: boolean
  generatingSection: string | null
  projectId: string
  onGenerate: () => void
  onGenerateSection?: (section: PremiseSectionKey) => void
  onChange: (value: string) => void
}

function OzymandiasSkeleton({ config }: { config: OzymandiasSectionConfig }) {
  const skeletonTone = ozymandiasSkeletonClass(config.tone)
  return (
    <div className={cn('p-4 bg-card rounded-md h-[100px] space-y-2', ozymandiasBorderClass(config.tone))}>
      <Skeleton className={cn('h-3 w-3/4 rounded-md', skeletonTone)} />
      <Skeleton className={cn('h-3 w-full rounded-md', skeletonTone)} />
      {config.key === EpisodePremiseSectionKey.InevitableConsequence && (
        <Skeleton className={cn('h-3 w-1/2 rounded-md', skeletonTone)} />
      )}
    </div>
  )
}

function OzymandiasEditor({
  config,
  value,
  onChange,
}: {
  config: OzymandiasSectionConfig
  value: string | undefined
  onChange: (value: string) => void
}) {
  return (
    <textarea
      className={cn(
        'w-full p-4 border rounded-md min-h-[100px] text-sm focus:ring-1 outline-none',
        ozymandiasEditClass(config.tone)
      )}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={config.placeholder}
    />
  )
}

function OzymandiasReadView({
  config,
  value,
  projectId,
}: {
  config: OzymandiasSectionConfig
  value: string
  projectId: string
}) {
  return (
    <div className={cn('p-4 bg-card rounded-md', ozymandiasBorderClass(config.tone))}>
      <ReferenceText text={value} projectId={projectId} className="text-foreground text-sm leading-relaxed" />
    </div>
  )
}

function OzymandiasEmptyState({
  config,
  onGenerate,
}: {
  config: OzymandiasSectionConfig
  onGenerate: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        'w-full p-4 bg-card border border-dashed rounded-md flex flex-col items-center justify-center min-h-[100px] transition-colors text-left',
        ozymandiasDashedClass(config.tone)
      )}
      onClick={onGenerate}
    >
      <RefreshCw className={cn('w-5 h-5 mb-2', ozymandiasEmptyIconClass(config.tone))} />
      <span className="text-xs text-muted-foreground">{config.emptyActionLabel}</span>
    </button>
  )
}

export function OzymandiasSection({
  config,
  value,
  isEditing,
  isGenerating,
  generatingSection,
  projectId,
  onGenerate,
  onGenerateSection,
  onChange,
}: OzymandiasSectionProps) {
  const Icon = config.icon
  const isGeneratingThis = generatingSection === config.key

  return (
    <section className="space-y-2 w-full">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'font-mono text-[11px] font-medium uppercase tracking-widest flex items-center gap-2',
            ozymandiasLabelClass(config.tone)
          )}
        >
          <Icon className="w-3.5 h-3.5" /> {config.label}
        </span>
        {!isEditing && onGenerateSection && (
          <Button
            size="icon"
            variant="ghost"
            className={cn('h-7 w-7 rounded-md text-muted-foreground', ozymandiasHoverClass(config.tone))}
            onClick={() => onGenerateSection(config.key)}
            disabled={isGenerating}
            title={`Regenerate ${config.label}`}
          >
            <RefreshCw className={isGeneratingThis ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} />
          </Button>
        )}
      </div>

      {isGeneratingThis ? (
        <OzymandiasSkeleton config={config} />
      ) : isEditing ? (
        <OzymandiasEditor config={config} value={value} onChange={onChange} />
      ) : value ? (
        <OzymandiasReadView config={config} value={value} projectId={projectId} />
      ) : (
        <OzymandiasEmptyState config={config} onGenerate={onGenerate} />
      )}
    </section>
  )
}

export function OzymandiasSections({
  localPremise,
  isEditing,
  isGenerating,
  generatingSection,
  projectId,
  onGenerate,
  onGenerateSection,
  onFieldChange,
  sections,
}: {
  localPremise: Partial<EpisodePremise>
  isEditing: boolean
  isGenerating: boolean
  generatingSection: string | null
  projectId: string
  onGenerate: () => void
  onGenerateSection?: (section: PremiseSectionKey) => void
  onFieldChange: (field: OzymandiasFieldKey, value: string) => void
  sections: OzymandiasSectionConfig[]
}) {
  return (
    <div className="space-y-5 w-full">
      {sections.map(config => (
        <OzymandiasSection
          key={config.key}
          config={config}
          value={localPremise[config.key] ?? undefined}
          isEditing={isEditing}
          isGenerating={isGenerating}
          generatingSection={generatingSection}
          projectId={projectId}
          onGenerate={onGenerate}
          onGenerateSection={onGenerateSection}
          onChange={value => onFieldChange(config.key, value)}
        />
      ))}
    </div>
  )
}
