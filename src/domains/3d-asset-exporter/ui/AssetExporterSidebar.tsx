'use client'

import { useState, type ReactNode } from 'react'
import { Plus, Scroll } from 'lucide-react'
import { DomainSidebar, SidebarEmptyState } from '@/components/DomainSidebar'
import {
  MasterPromptField,
  MasterPromptSuggestMode,
  MasterPromptSuggestion,
} from '@/components/MasterPromptField'
import { ThreeDAssets, type ThreeDAssetsProps } from '@/components/ThreeDAssets'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { getRandomWorldPromptIdea } from '@/shared/data/constants/worldPromptIdeas'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { AssetExporterFooter } from './AssetExporterFooter'
import {
  AssetExporterSidebarClass,
  AssetExporterSidebarCopy,
  AssetExporterSidebarStorage,
} from './constants/asset-exporter-sidebar'

export type AssetExporterAssetsBind = ThreeDAssetsProps & {
  selectedCount: number
  readyCount: number
  selectAll: () => void
  clearSelection: () => void
  exportSelected: () => void
  exportingCount: number | null
  hasSelection: boolean
}

export interface AssetExporterSidebarProps {
  currentProject: { id: string } | null
  assetsBind: AssetExporterAssetsBind
  settingsDialog: ReactNode
}

export function AssetExporterSidebar({
  currentProject,
  assetsBind,
  settingsDialog,
}: AssetExporterSidebarProps) {
  const [masterPrompt, setMasterPrompt] = useState(() => {
    if (typeof window === 'undefined') return ''
    return browserStorage.getString(LocalStorageKeys.MASTER_PROMPT) || ''
  })
  const [suggestedIdea, setSuggestedIdea] = useState<string | null>(null)

  const persistPrompt = (value: string) => {
    browserStorage.setString(LocalStorageKeys.MASTER_PROMPT, value)
  }

  const {
    selectedCount,
    readyCount,
    selectAll,
    clearSelection,
    exportSelected,
    exportingCount,
    hasSelection,
    ...assetsProps
  } = assetsBind

  return (
    <DomainSidebar
      header={AssetExporterSidebarCopy.Wordmark}
      wordmark={AssetExporterSidebarCopy.Wordmark}
      storageKey={AssetExporterSidebarStorage.Panel}
      collapsible
      collapseStorageId={currentProject?.id}
      footer={
        currentProject ? (
          <AssetExporterFooter
            readyCount={readyCount}
            selectedCount={selectedCount}
            hasSelection={hasSelection}
            exportingCount={exportingCount}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onExport={exportSelected}
          />
        ) : null
      }
    >
      {currentProject ? (
        <div className={AssetExporterSidebarClass.Body}>
          <div id={TOUR_STEP_IDS.ASSET_MASTER_PROMPT}>
            <MasterPromptField
              label={AssetExporterSidebarCopy.PromptLabel}
              icon={<Scroll size={12} strokeWidth={1.7} />}
              value={masterPrompt}
              onChange={setMasterPrompt}
              onBlur={() => persistPrompt(masterPrompt)}
              placeholder={AssetExporterSidebarCopy.PromptPlaceholder}
              suggestMode={MasterPromptSuggestMode.Iterate}
              onSuggest={() => setSuggestedIdea(getRandomWorldPromptIdea())}
              suggestion={
                suggestedIdea ? (
                  <MasterPromptSuggestion
                    idea={suggestedIdea}
                    onAccept={() => {
                      setMasterPrompt(suggestedIdea)
                      persistPrompt(suggestedIdea)
                      setSuggestedIdea(null)
                    }}
                    onReject={() => setSuggestedIdea(null)}
                    onNext={() => setSuggestedIdea(getRandomWorldPromptIdea())}
                  />
                ) : undefined
              }
            />
          </div>
          <div className={AssetExporterSidebarClass.Divider} />
          <div id={TOUR_STEP_IDS.ASSET_UPLOAD_ZONE}>
            <ThreeDAssets {...assetsProps} />
          </div>
        </div>
      ) : (
        <SidebarEmptyState
          icon={<Plus size={24} className="opacity-50" />}
          message={AssetExporterSidebarCopy.EmptyProject}
        />
      )}
      {settingsDialog}
    </DomainSidebar>
  )
}
