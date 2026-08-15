import React from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/Button'
import { SidebarSection, SidebarLabel, SidebarTextarea } from '@/components/DomainSidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/DropdownMenu'
import { QuickActionLabel } from '@/shared/chat/core/constants/quick-actions'
import { GENERATION_MODES } from '@/domains/2d-canvas/constants/generation-modes'
import type { WorldGenSidebarState } from '@/domains/2d-canvas/state/hooks/useWorldGenSidebar'
import { WorldGenSidebarWorldCopy } from '../../constants/sidebar'

type SidebarWorldSectionProps = Pick<
  WorldGenSidebarState,
  'masterPrompt' | 'handleMasterPromptChange' | 'handleSelectGenerationMode' | 'generationMode'
>

export const SidebarWorldSection: React.FC<SidebarWorldSectionProps> = ({
  masterPrompt,
  handleMasterPromptChange,
  handleSelectGenerationMode,
  generationMode,
}) => {
  return (
    <SidebarSection title={WorldGenSidebarWorldCopy.Title}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <SidebarLabel>{WorldGenSidebarWorldCopy.PromptLabel}</SidebarLabel>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs gap-1 border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Sparkles size={12} />
                {QuickActionLabel.SuggestIdea}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              {GENERATION_MODES.map(mode => (
                <DropdownMenuItem
                  key={mode.id}
                  className="flex flex-col items-start gap-0.5 py-2"
                  onSelect={() => handleSelectGenerationMode(mode)}
                  data-selected={mode.id === generationMode}
                >
                  <span className="text-sm font-medium">{mode.name}</span>
                  <span className="text-xs text-muted-foreground whitespace-normal">
                    {mode.hint}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <SidebarTextarea
          value={masterPrompt}
          onChange={e => handleMasterPromptChange(e.target.value)}
          placeholder={WorldGenSidebarWorldCopy.Placeholder}
          className="h-24"
        />
      </div>
    </SidebarSection>
  )
}
