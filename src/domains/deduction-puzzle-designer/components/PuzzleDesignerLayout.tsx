'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { DeductionLogicMap } from './LogicMap/DeductionLogicMap'
import { NarrativeInput } from './ScenarioDefinition/NarrativeInput'
import { SolutionTemplateBuilder } from './ScenarioDefinition/SolutionTemplateBuilder'
import { SentenceBuilder } from './ScenarioDefinition/SentenceBuilder'

import { ScenePreview } from './SceneStaging/ScenePreview'
import { CollectableWordList } from './SceneStaging/CollectableWordList'
import { ValidationPanel } from './SceneStaging/ValidationPanel'

interface PuzzleDesignerLayoutProps {
  children?: React.ReactNode
}

export function PuzzleDesignerLayout({ children }: PuzzleDesignerLayoutProps) {
  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground overflow-hidden">
      <header className="flex h-14 items-center border-b px-6">
        <h1 className="text-lg font-semibold">Deduction Puzzle Designer</h1>
        {/* Add more header controls here later */}
      </header>
      <main className="flex flex-1 overflow-hidden p-4 gap-4">
        {/* Left Column: Scenario Definition */}
        <Card className="flex w-[30%] flex-col gap-4 p-4 border-none bg-secondary/20">
          <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Scenario Definition
          </div>
          <div
            id="scenario-definition-container"
            className="flex-1 overflow-y-auto flex flex-col gap-4"
          >
            <NarrativeInput />
            <SolutionTemplateBuilder />
            <SentenceBuilder />
          </div>
        </Card>

        {/* Center Column: Deduction Logic Map */}
        <div className="flex flex-1 flex-col gap-4 relative">
          <div className="absolute top-0 left-0 z-10 p-2">
            <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Deduction Logic Map
            </span>
          </div>
          <div
            id="logic-map-container"
            className="flex-1 rounded-xl border bg-card/50 shadow-inner overflow-hidden"
          >
            <DeductionLogicMap />
          </div>
        </div>

        {/* Right Column: Scene Staging & Word Bank */}
        <Card className="flex w-[25%] flex-col gap-4 p-4 border-none bg-secondary/20">
          <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Scene Staging & Word Bank
          </div>
          <div id="scene-staging-container" className="flex-1 flex flex-col gap-4 overflow-y-auto">
            <ScenePreview />
            <CollectableWordList />
            <ValidationPanel />
          </div>
        </Card>
      </main>
    </div>
  )
}
