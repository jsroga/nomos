'use client'

import React from 'react'
import {
  AlertCircle,
  BarChart3,
  Check,
  Cloud,
  Gamepad2,
  Layers,
  Search,
  Star,
  Swords,
  Upload,
  Wand2,
} from 'lucide-react'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { LoopNodeType } from '@/domains/loop-creator/constants/custom-nodes'
import { CANVAS_NODE_TYPE_GROUP } from '@/domains/loop-creator/constants/graph-state-defaults'
import { LoopAutoSaveStatus } from '@/domains/loop-creator/constants/auto-save'
import { LoopSelector } from './LoopSelector'
import type { PersistedGameLoop } from '@/domains/loop-creator/core/io/loops.api'
import { LoopAnalysisDialog } from './LoopAnalysisDialog'
import {
  readLoopMetadataName,
  readLoopMetadataVersion,
} from '../types/loop-layout-wires'

interface LoopCreatorHeaderProps {
  projectId: string
  currentLoopId: string | null
  loopMetadata: unknown | null
  analysis: unknown | null
  nodeCount: number
  edgeCount: number
  groundingScore: number | null
  saveStatus: {
    status: LoopAutoSaveStatus
    lastSaved: Date | null
  }
  showCreateLoopDialog: boolean
  loopSelectorTourId: string
  onLoopChange: (loop: PersistedGameLoop | null) => void
  onCreateLoop: (name: string, gameConcept?: string) => Promise<PersistedGameLoop | null>
  onReset: () => void
  onShowCreateLoopDialogChange: (open: boolean) => void
  onLoopCreatedWithConcept: (loop: PersistedGameLoop, gameConcept: string) => void
  onTidyUp: () => void
  onOpenMarketAnalysis: () => void
  onImportJson: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function LoopCreatorHeader({
  projectId,
  currentLoopId,
  loopMetadata,
  analysis,
  nodeCount,
  edgeCount,
  groundingScore,
  saveStatus,
  showCreateLoopDialog,
  loopSelectorTourId,
  onLoopChange,
  onCreateLoop,
  onReset,
  onShowCreateLoopDialogChange,
  onLoopCreatedWithConcept,
  onTidyUp,
  onOpenMarketAnalysis,
  onImportJson,
}: LoopCreatorHeaderProps) {
  const metadataName = readLoopMetadataName(loopMetadata)
  const metadataVersion = readLoopMetadataVersion(loopMetadata)

  return (
    <header className="flex h-14 items-center justify-between border-b px-6 bg-card/50">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">Loop Creator</h1>
        <div id={loopSelectorTourId}>
          <LoopSelector
            projectId={projectId}
            currentLoopId={currentLoopId}
            onLoopChange={onLoopChange}
            onCreateLoop={onCreateLoop}
            onReset={onReset}
            externalOpenDialog={showCreateLoopDialog}
            onExternalOpenDialogChange={onShowCreateLoopDialogChange}
            onLoopCreated={onLoopCreatedWithConcept}
          />
        </div>
        {metadataName && (
          <Badge variant="secondary" className="text-[10px] h-5">
            {metadataName} v{metadataVersion}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground mr-4">
          <span>{nodeCount} nodes</span>
          <span>{edgeCount} edges</span>
          {groundingScore !== null && (
            <span className="text-emerald-500">
              Grounding: {Math.round(groundingScore * 100)}%
            </span>
          )}
          {currentLoopId && (
            <div className="flex items-center gap-1.5">
              {saveStatus.status === LoopAutoSaveStatus.Saving && (
                <>
                  <Cloud className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  <span className="text-xs text-blue-400">Saving...</span>
                </>
              )}
              {saveStatus.status === LoopAutoSaveStatus.Saved && (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-emerald-400">Saved</span>
                </>
              )}
              {saveStatus.status === LoopAutoSaveStatus.Error && (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs text-red-400">Save failed</span>
                </>
              )}
              {saveStatus.status === LoopAutoSaveStatus.Idle && saveStatus.lastSaved && (
                <span className="text-xs text-muted-foreground/60">Synced</span>
              )}
            </div>
          )}
        </div>

        {analysis != null ? (
          <LoopAnalysisDialog analysis={analysis} loopMetadata={loopMetadata} />
        ) : null}

        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-8 border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400"
          onClick={onTidyUp}
        >
          <Wand2 className="w-4 h-4" />
          Tidy Up
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-8 border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-400"
          onClick={onOpenMarketAnalysis}
        >
          <Search className="w-4 h-4" />
          Market Analysis
        </Button>

        <div className="flex items-center">
          <input
            type="file"
            id="json-import"
            accept=".json"
            className="hidden"
            onChange={onImportJson}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-primary/10 border-primary/20 hover:bg-primary/20 transition-colors h-8"
            onClick={() => document.getElementById('json-import')?.click()}
          >
            <Upload className="w-4 h-4" />
            Import JSON
          </Button>
        </div>
      </div>
    </header>
  )
}

interface LoopNodeToolbarProps {
  onCreateNode: (nodeType: LoopNodeType | typeof CANVAS_NODE_TYPE_GROUP) => void
}

export function LoopNodeToolbar({ onCreateNode }: LoopNodeToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-6 py-2 border-b bg-card/30">
      <span className="text-xs text-muted-foreground mr-2">Add:</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2.5 gap-1.5 text-xs hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/30"
        onClick={() => onCreateNode(LoopNodeType.Challenge)}
      >
        <Swords className="w-3.5 h-3.5 text-red-400" />
        Challenge
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2.5 gap-1.5 text-xs hover:bg-blue-500/10 hover:text-blue-400 border border-transparent hover:border-blue-500/30"
        onClick={() => onCreateNode(LoopNodeType.Action)}
      >
        <Gamepad2 className="w-3.5 h-3.5 text-blue-400" />
        Action
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2.5 gap-1.5 text-xs hover:bg-yellow-500/10 hover:text-yellow-400 border border-transparent hover:border-yellow-500/30"
        onClick={() => onCreateNode(LoopNodeType.Reward)}
      >
        <Star className="w-3.5 h-3.5 text-yellow-400" />
        Reward
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2.5 gap-1.5 text-xs hover:bg-green-500/10 hover:text-green-400 border border-transparent hover:border-green-500/30"
        onClick={() => onCreateNode(LoopNodeType.Feedback)}
      >
        <BarChart3 className="w-3.5 h-3.5 text-green-400" />
        Feedback
      </Button>
      <div className="w-px h-5 bg-border mx-1" />
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2.5 gap-1.5 text-xs hover:bg-purple-500/10 hover:text-purple-400 border border-transparent hover:border-purple-500/30"
        onClick={() => onCreateNode(CANVAS_NODE_TYPE_GROUP)}
      >
        <Layers className="w-3.5 h-3.5 text-purple-400" />
        Group
      </Button>
    </div>
  )
}
