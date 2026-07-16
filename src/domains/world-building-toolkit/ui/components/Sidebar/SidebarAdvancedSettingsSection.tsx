import React from 'react'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { Button } from '@/components/Button'
import { SidebarSection, SidebarLabel, SidebarTextarea } from '@/components/DomainSidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/Tooltip'
import { Loader2, BookOpen, Palette, ChevronDown, ChevronUp, Info } from 'lucide-react'
import type { WorldGenSidebarState } from '@/domains/world-building-toolkit/state/hooks/useWorldGenSidebar'

type SidebarAdvancedSettingsSectionProps = Pick<
  WorldGenSidebarState,
  | 'showAdvancedSettings'
  | 'setShowAdvancedSettings'
  | 'masterPrompt'
  | 'handleMasterPromptChange'
  | 'fetchWorldSummary'
  | 'isFetchingSummary'
  | 'currentProject'
  | 'activeStyleUrls'
  | 'selectedStyleUrlIndex'
  | 'handleSelectStyleUrl'
>

export const SidebarAdvancedSettingsSection: React.FC<SidebarAdvancedSettingsSectionProps> = ({
  showAdvancedSettings,
  setShowAdvancedSettings,
  masterPrompt,
  handleMasterPromptChange,
  fetchWorldSummary,
  isFetchingSummary,
  currentProject,
  activeStyleUrls,
  selectedStyleUrlIndex,
  handleSelectStyleUrl,
}) => {
  return (
    <div id={TOUR_STEP_IDS.WORLDGEN_STYLE_PROMPT}>
      <SidebarSection
        separator
        icon={<Palette size={12} />}
        title="Advanced Settings"
        rightContent={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvancedSettings(prev => !prev)}
            className="h-7 gap-1 px-2 text-[10px] font-mono uppercase tracking-wide"
          >
            {showAdvancedSettings ? 'Hide' : 'Show'}
            {showAdvancedSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </Button>
        }
      >
        {showAdvancedSettings ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <SidebarLabel>Style Prompt</SidebarLabel>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={12} className="text-muted-foreground/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="max-w-[200px]">
                      Define the overall art style that will be applied to all generated tiles
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] gap-1 font-mono"
                    onClick={fetchWorldSummary}
                    disabled={isFetchingSummary || !currentProject}
                  >
                    {isFetchingSummary ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <BookOpen size={10} />
                    )}
                    Fetch
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Import style from Storyteller World Bible</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <SidebarTextarea
              value={masterPrompt}
              onChange={e => handleMasterPromptChange(e.target.value)}
              placeholder="Define the overall art style and aesthetic..."
              className="h-24"
            />
            {activeStyleUrls.length > 0 && (
              <div className="space-y-1.5">
                <SidebarLabel>Style Reference Image</SidebarLabel>
                <div className="flex flex-wrap gap-1.5">
                  {activeStyleUrls.map((url, idx) => {
                    const isSelected = idx === Math.min(selectedStyleUrlIndex, activeStyleUrls.length - 1)
                    return (
                      <button
                        key={url}
                        onClick={() => handleSelectStyleUrl(idx)}
                        className={[
                          'relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-150',
                          isSelected
                            ? 'border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.3)] scale-105'
                            : 'border-border/50 hover:border-primary/60 hover:scale-105 opacity-60 hover:opacity-100',
                        ].join(' ')}
                        title={`Style reference ${idx + 1}`}
                      >
                        <img
                          src={url}
                          alt={`Style reference ${idx + 1}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                            <div className="h-2 w-2 rounded-full bg-primary shadow" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </SidebarSection>
    </div>
  )
}
