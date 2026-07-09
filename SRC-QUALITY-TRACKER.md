# src/ quality tracker

Generated: 2026-07-09 16:27:23 · **725 files** in `src/**`

| Metric | clean | errors | pending | exempt |
|--------|------:|-------:|--------:|-------:|
| TSC | 2 | 0 | 701 | 22 |
| MagicStr | 225 | 478 | 0 | 22 |

## Fix loop (fast — ~5s per file)

1. Fix file
2. `npm run qualitygate:file -- src/path/file.ts` — validate (TSC + ESLint + metrics)
3. `npm run qualitygate:tracker -- --file src/path/file.ts` — update this row

## Bulk refresh

| Command | Time | What |
|---------|------|------|
| `npm run qualitygate:tracker -- --skip-tsc` | ~30s | ESLint/magic-string counts for all files |
| `npm run qualitygate:tracker -- --file <path>` | ~5s | TSC + magic-string for **one** file |
| `npm run qualitygate:tracker -- --skip-tsc -- --bootstrap-tsc` | ~5 min | TSC baseline (run once, not per fix) |

State: `.local/quality-tracker-state.json`

| File | TSC | MagicStr | Notes |
|------|-----|----------|-------|
| `src/__tests__/src-topology.ts` | pending | 48 viol | — |
| `src/__tests__/structure.test.ts` | pending | 66 viol | — |
| `src/app/(auth)/auth/callback/route.ts` | pending | 3 viol | — |
| `src/app/(auth)/auth/reset-password/page.tsx` | pending | 2 viol | — |
| `src/app/(auth)/login/layout.tsx` | pending | 1 viol | — |
| `src/app/(auth)/login/page.tsx` | pending | 14 viol | — |
| `src/app/(marketing)/page.tsx` | pending | clean | — |
| `src/app/(marketing)/privacy/page.tsx` | pending | clean | — |
| `src/app/(marketing)/terms/page.tsx` | pending | clean | — |
| `src/app/(workspace)/[projectId]/asset-exporter/layout.tsx` | pending | 1 viol | — |
| `src/app/(workspace)/[projectId]/asset-exporter/page.tsx` | pending | clean | — |
| `src/app/(workspace)/[projectId]/deduction-puzzle/layout.tsx` | pending | 1 viol | — |
| `src/app/(workspace)/[projectId]/deduction-puzzle/page.tsx` | pending | clean | eslint 1 |
| `src/app/(workspace)/[projectId]/interior-design/layout.tsx` | pending | 1 viol | — |
| `src/app/(workspace)/[projectId]/interior-design/page.tsx` | pending | clean | — |
| `src/app/(workspace)/[projectId]/layout.tsx` | pending | 1 viol | — |
| `src/app/(workspace)/[projectId]/loop-creator/layout.tsx` | pending | 1 viol | — |
| `src/app/(workspace)/[projectId]/loop-creator/page.tsx` | pending | clean | — |
| `src/app/(workspace)/[projectId]/page.tsx` | pending | clean | — |
| `src/app/(workspace)/[projectId]/storyteller/layout.tsx` | pending | 1 viol | — |
| `src/app/(workspace)/[projectId]/storyteller/page.tsx` | pending | clean | — |
| `src/app/(workspace)/[projectId]/world-gen/layout.tsx` | pending | 1 viol | — |
| `src/app/(workspace)/[projectId]/world-gen/page.tsx` | pending | 13 viol | — |
| `src/app/(workspace)/layout.tsx` | pending | 1 viol | — |
| `src/app/(workspace)/projects/page.tsx` | pending | 21 viol | — |
| `src/app/api/admin/migrate/route.ts` | pending | 2 viol | — |
| `src/app/api/ai/fal-segment/route.ts` | pending | 2 viol | — |
| `src/app/api/ai/segment/route.ts` | pending | 2 viol | — |
| `src/app/api/api-keys/route.ts` | pending | 20 viol | — |
| `src/app/api/assets/[assetId]/route.ts` | pending | 8 viol | — |
| `src/app/api/assets/upload/route.ts` | pending | 21 viol | — |
| `src/app/api/auth/forgot-password/route.ts` | pending | 3 viol | — |
| `src/app/api/auth/signin/route.ts` | pending | 2 viol | — |
| `src/app/api/auth/signup/route.ts` | pending | 3 viol | — |
| `src/app/api/complete-token/route.ts` | pending | 3 viol | — |
| `src/app/api/debug/inspect/[id]/route.ts` | pending | 1 viol | — |
| `src/app/api/delete-image/route.ts` | pending | 6 viol | — |
| `src/app/api/entities/[entityId]/route.ts` | pending | 16 viol | — |
| `src/app/api/entities/mark-referenced/route.ts` | pending | 4 viol | — |
| `src/app/api/entities/relationships/route.ts` | pending | 21 viol | — |
| `src/app/api/entities/resolve/route.ts` | pending | 25 viol | — |
| `src/app/api/entities/route.ts` | pending | 18 viol | — |
| `src/app/api/generate-3d/route.ts` | pending | 31 viol | — |
| `src/app/api/interior-designer/designs/route.ts` | pending | 21 viol | — |
| `src/app/api/interior-designer/material/[taskId]/route.ts` | pending | 3 viol | — |
| `src/app/api/interior-designer/material/route.ts` | pending | 6 viol | — |
| `src/app/api/interior-designer/retexture/[runId]/route.ts` | pending | 2 viol | — |
| `src/app/api/interior-designer/retexture/route.ts` | pending | 10 viol | — |
| `src/app/api/interior-designer/text-to-3d/[taskId]/route.ts` | pending | 3 viol | — |
| `src/app/api/interior-designer/text-to-3d/route.ts` | pending | 7 viol | — |
| `src/app/api/interior-designer/texture/route.ts` | pending | 3 viol | — |
| `src/app/api/interior-designer/textures/route.ts` | pending | 1 viol | — |
| `src/app/api/library/route.ts` | pending | 9 viol | — |
| `src/app/api/llm-judge/route.ts` | pending | 6 viol | — |
| `src/app/api/loop-creator/chat/route.ts` | pending | 23 viol | — |
| `src/app/api/loop-creator/loops/route.ts` | pending | 36 viol | — |
| `src/app/api/loop-creator/market-analysis/[gameLoopId]/route.ts` | pending | 14 viol | — |
| `src/app/api/loop-creator/market-analysis/route.ts` | pending | 11 viol | — |
| `src/app/api/mcp/route.ts` | pending | 11 viol | — |
| `src/app/api/projects/[projectId]/onboarding/route.ts` | pending | 13 viol | — |
| `src/app/api/proxy-model/route.ts` | pending | 15 viol | — |
| `src/app/api/repaint/route.ts` | pending | 17 viol | — |
| `src/app/api/save-image/route.ts` | pending | 11 viol | — |
| `src/app/api/save-model/route.ts` | pending | 14 viol | — |
| `src/app/api/settings/providers/route.ts` | pending | 1 viol | — |
| `src/app/api/storyteller/actions/route.ts` | pending | 36 viol | — |
| `src/app/api/storyteller/beats/[beatId]/generate-image/route.ts` | pending | 3 viol | — |
| `src/app/api/storyteller/beats/[beatId]/route.ts` | pending | 8 viol | — |
| `src/app/api/storyteller/beats/generate-prompt/route.ts` | pending | 13 viol | — |
| `src/app/api/storyteller/beats/status/route.ts` | pending | 6 viol | — |
| `src/app/api/storyteller/bible/lock/route.ts` | pending | 22 viol | — |
| `src/app/api/storyteller/bible/route.ts` | pending | 29 viol | — |
| `src/app/api/storyteller/characters/[characterId]/route.ts` | pending | 4 viol | — |
| `src/app/api/storyteller/characters/route.ts` | pending | 36 viol | — |
| `src/app/api/storyteller/chat/answer/route.ts` | pending | 10 viol | — |
| `src/app/api/storyteller/chat/route.ts` | pending | 20 viol | — |
| `src/app/api/storyteller/chat/stream/route.ts` | pending | 106 viol | — |
| `src/app/api/storyteller/consistency/apply/route.ts` | pending | 11 viol | — |
| `src/app/api/storyteller/consistency/check/route.ts` | pending | 9 viol | — |
| `src/app/api/storyteller/consistency/undo/route.ts` | pending | 10 viol | — |
| `src/app/api/storyteller/episodes/[episodeId]/beats/route.ts` | pending | 9 viol | — |
| `src/app/api/storyteller/episodes/[episodeId]/generate-combined/route.ts` | pending | 3 viol | — |
| `src/app/api/storyteller/episodes/[episodeId]/generate-poster/route.ts` | pending | 4 viol | — |
| `src/app/api/storyteller/episodes/[episodeId]/route.ts` | pending | 8 viol | — |
| `src/app/api/storyteller/episodes/poster/status/route.ts` | pending | 6 viol | — |
| `src/app/api/storyteller/episodes/route.ts` | pending | 14 viol | — |
| `src/app/api/storyteller/generate-metrics/route.ts` | pending | 9 viol | — |
| `src/app/api/storyteller/generate-portrait/route.ts` | pending | 8 viol | — |
| `src/app/api/storyteller/generate-portrait/status/route.ts` | pending | 7 viol | — |
| `src/app/api/storyteller/moodboard/status/route.ts` | pending | 7 viol | — |
| `src/app/api/storyteller/moodboard/trigger/route.ts` | pending | 19 viol | — |
| `src/app/api/storyteller/plan/route.ts` | pending | 22 viol | — |
| `src/app/api/storyteller/projects/[id]/route.ts` | pending | 17 viol | — |
| `src/app/api/storyteller/projects/route.ts` | pending | 6 viol | — |
| `src/app/api/storyteller/relationships/route.ts` | pending | 55 viol | — |
| `src/app/api/storyteller/save-episode-poster-variant/route.ts` | pending | 13 viol | — |
| `src/app/api/storyteller/save-portrait-variant/route.ts` | pending | 15 viol | — |
| `src/app/api/storyteller/script-review/route.ts` | pending | 25 viol | — |
| `src/app/api/storyteller/script/edit/route.ts` | pending | 3 viol | — |
| `src/app/api/storyteller/snapshots/route.ts` | pending | 26 viol | — |
| `src/app/api/storyteller/timeline/route.ts` | pending | 19 viol | — |
| `src/app/api/storyteller/workflow/resume/route.ts` | pending | 16 viol | — |
| `src/app/api/storyteller/world-summary/route.ts` | pending | 18 viol | — |
| `src/app/api/tiles/accept-upscale/route.ts` | pending | 6 viol | — |
| `src/app/api/tiles/upload/route.ts` | pending | 12 viol | — |
| `src/app/api/trigger-3d/remesh/route.ts` | pending | 5 viol | — |
| `src/app/api/trigger-3d/route.ts` | pending | 9 viol | — |
| `src/app/api/trigger-3d/status/route.ts` | pending | 7 viol | — |
| `src/app/api/trigger-fidelity/route.ts` | pending | 10 viol | — |
| `src/app/api/trigger-fidelity/status/route.ts` | pending | 8 viol | — |
| `src/app/api/trigger-tile/route.ts` | pending | 17 viol | — |
| `src/app/api/trigger-tile/status/route.ts` | pending | 8 viol | — |
| `src/app/api/trigger-upload/route.ts` | pending | 2 viol | — |
| `src/app/api/trigger-upscale/route.ts` | pending | 11 viol | — |
| `src/app/api/trigger-upscale/select-variant/route.ts` | pending | 5 viol | — |
| `src/app/api/trigger-upscale/status/route.ts` | pending | 8 viol | — |
| `src/app/api/trigger/token/route.ts` | pending | 4 viol | — |
| `src/app/api/upload-tile/route.ts` | pending | 9 viol | — |
| `src/app/api/upscale/midjourney/route.ts` | pending | 28 viol | — |
| `src/app/api/users/onboarding/route.ts` | pending | 13 viol | — |
| `src/app/api/waitlist/route.ts` | pending | 4 viol | — |
| `src/app/api/workflows/game-design/route.ts` | pending | 20 viol | — |
| `src/app/api/workflows/resume/route.ts` | pending | 4 viol | — |
| `src/app/api/world/assets/route.ts` | pending | 2 viol | — |
| `src/app/api/world/projects/route.ts` | pending | 5 viol | — |
| `src/app/api/world/tiles/route.ts` | pending | 4 viol | — |
| `src/app/error.tsx` | pending | clean | — |
| `src/app/global-error.tsx` | pending | clean | — |
| `src/app/layout.tsx` | pending | 9 viol | — |
| `src/components/AlertDialog/AlertDialog.tsx` | pending | 2 viol | — |
| `src/components/AlertDialog/index.ts` | pending | clean | — |
| `src/components/AsyncStatusIndicator/AsyncStatusIndicator.tsx` | pending | 49 viol | — |
| `src/components/AsyncStatusIndicator/index.ts` | pending | clean | — |
| `src/components/AuthProvider/AuthProvider.tsx` | pending | clean | — |
| `src/components/AuthProvider/index.ts` | pending | clean | — |
| `src/components/Avatar/Avatar.tsx` | pending | clean | — |
| `src/components/Avatar/index.ts` | pending | clean | — |
| `src/components/Badge/Badge.tsx` | pending | 3 viol | — |
| `src/components/Badge/index.ts` | pending | clean | — |
| `src/components/BleedingText/BleedingText.tsx` | pending | 4 viol | — |
| `src/components/BleedingText/index.ts` | pending | clean | — |
| `src/components/Button/Button.tsx` | pending | 13 viol | — |
| `src/components/Button/index.ts` | pending | clean | — |
| `src/components/Card/Card.tsx` | pending | 6 viol | — |
| `src/components/Card/index.ts` | pending | clean | — |
| `src/components/ConfirmDialog/ConfirmDialog.tsx` | pending | 3 viol | — |
| `src/components/ConfirmDialog/index.ts` | pending | clean | — |
| `src/components/Dialog/Dialog.tsx` | pending | 2 viol | — |
| `src/components/Dialog/index.ts` | pending | clean | — |
| `src/components/DomainSidebar/DomainSidebar.tsx` | pending | 9 viol | — |
| `src/components/DomainSidebar/index.ts` | pending | clean | — |
| `src/components/DropdownMenu/DropdownMenu.tsx` | pending | 1 viol | — |
| `src/components/DropdownMenu/index.ts` | pending | clean | — |
| `src/components/EntityPicker/EntityPicker.tsx` | pending | 2 viol | — |
| `src/components/EntityPicker/index.ts` | pending | clean | — |
| `src/components/ErrorBoundary/ErrorBoundary.tsx` | pending | 15 viol | — |
| `src/components/ErrorBoundary/index.ts` | pending | clean | — |
| `src/components/ErrorBoundaryWrapper/ErrorBoundaryWrapper.tsx` | pending | clean | — |
| `src/components/ErrorBoundaryWrapper/index.ts` | pending | clean | — |
| `src/components/GlowEffect/GlowEffect.tsx` | pending | 10 viol | — |
| `src/components/GlowEffect/index.ts` | pending | clean | — |
| `src/components/IconButton/IconButton.tsx` | pending | 5 viol | — |
| `src/components/IconButton/index.ts` | pending | clean | — |
| `src/components/ImageLightbox/ImageLightbox.tsx` | pending | 4 viol | — |
| `src/components/ImageLightbox/index.ts` | pending | clean | — |
| `src/components/Input/Input.tsx` | pending | 1 viol | — |
| `src/components/Input/index.ts` | pending | clean | — |
| `src/components/Label/Label.tsx` | pending | 1 viol | — |
| `src/components/Label/index.ts` | pending | clean | — |
| `src/components/LiquidGlass/LiquidGlass.tsx` | pending | clean | — |
| `src/components/LiquidGlass/index.ts` | pending | clean | — |
| `src/components/LoginButton/LoginButton.tsx` | pending | 1 viol | — |
| `src/components/LoginButton/index.ts` | pending | clean | — |
| `src/components/Progress/Progress.tsx` | pending | 1 viol | — |
| `src/components/Progress/index.ts` | pending | clean | — |
| `src/components/ScrollArea/ScrollArea.tsx` | pending | 1 viol | — |
| `src/components/ScrollArea/index.ts` | pending | clean | — |
| `src/components/Skeleton/Skeleton.tsx` | pending | clean | — |
| `src/components/Skeleton/index.ts` | pending | clean | — |
| `src/components/Slider/Slider.tsx` | pending | clean | — |
| `src/components/Slider/index.ts` | pending | clean | — |
| `src/components/Switch/Switch.tsx` | pending | clean | — |
| `src/components/Switch/index.ts` | pending | clean | — |
| `src/components/Tabs/Tabs.tsx` | pending | clean | — |
| `src/components/Tabs/index.ts` | pending | clean | — |
| `src/components/TextEffects/TextEffects.tsx` | pending | 9 viol | — |
| `src/components/TextEffects/index.ts` | pending | clean | — |
| `src/components/Textarea/Textarea.tsx` | pending | 1 viol | — |
| `src/components/Textarea/index.ts` | pending | clean | — |
| `src/components/Tooltip/Tooltip.tsx` | pending | clean | — |
| `src/components/Tooltip/index.ts` | pending | clean | — |
| `src/components/shell/GameHubDashboard/GameHubDashboard.tsx` | pending | 39 viol | — |
| `src/components/shell/GameHubDashboard/index.ts` | pending | clean | — |
| `src/components/shell/GlobalHeader/GlobalHeader.tsx` | pending | clean | — |
| `src/components/shell/GlobalHeader/index.ts` | pending | clean | — |
| `src/components/shell/GlobalSidebar/GlobalSidebar.tsx` | pending | clean | — |
| `src/components/shell/GlobalSidebar/index.ts` | pending | clean | — |
| `src/components/shell/ModuleOnboardingController/ModuleOnboardingController.tsx` | pending | 11 viol | — |
| `src/components/shell/ModuleOnboardingController/index.ts` | pending | clean | — |
| `src/components/shell/ProjectLoader/ProjectLoader.tsx` | pending | clean | — |
| `src/components/shell/ProjectLoader/index.ts` | pending | clean | — |
| `src/components/shell/ProjectSelectorDropdown/ProjectSelectorDropdown.tsx` | pending | 7 viol | — |
| `src/components/shell/ProjectSelectorDropdown/index.ts` | pending | clean | — |
| `src/components/shell/ProjectTourWrapper/ProjectTourWrapper.tsx` | pending | clean | — |
| `src/components/shell/ProjectTourWrapper/index.ts` | pending | clean | — |
| `src/components/shell/Tour/Tour.tsx` | pending | 17 viol | — |
| `src/components/shell/Tour/index.ts` | pending | clean | — |
| `src/components/shell/TroubleshootIndicator/TroubleshootIndicator.tsx` | pending | clean | — |
| `src/components/shell/TroubleshootIndicator/index.ts` | pending | clean | — |
| `src/components/shell/TroubleshootPanel/TroubleshootPanel.tsx` | pending | 5 viol | — |
| `src/components/shell/TroubleshootPanel/index.ts` | pending | clean | — |
| `src/db/client.ts` | pending | clean | eslint 1 |
| `src/db/index.ts` | pending | clean | — |
| `src/db/schema.ts` | pending | 357 viol | — |
| `src/domains/3d-asset-exporter/index.ts` | pending | clean | — |
| `src/domains/3d-asset-exporter/io/asset-exporter.api.ts` | pending | clean | — |
| `src/domains/3d-asset-exporter/io/asset-exporter.dto.ts` | pending | clean | — |
| `src/domains/3d-asset-exporter/io/asset-exporter.keys.ts` | pending | 1 viol | — |
| `src/domains/3d-asset-exporter/state/index.ts` | pending | clean | — |
| `src/domains/3d-asset-exporter/state/queries/index.ts` | pending | clean | — |
| `src/domains/3d-asset-exporter/tasks/generate-3d-model.task.ts` | pending | 39 viol | — |
| `src/domains/3d-asset-exporter/tasks/remesh-3d-model.task.ts` | pending | 27 viol | — |
| `src/domains/3d-asset-exporter/tasks/retexture-model.task.ts` | pending | 27 viol | — |
| `src/domains/3d-asset-exporter/tasks/surface-material.task.ts` | pending | 43 viol | — |
| `src/domains/3d-asset-exporter/tasks/text-to-3d.task.ts` | pending | 47 viol | — |
| `src/domains/3d-asset-exporter/ui/AssetEditor.tsx` | pending | clean | — |
| `src/domains/3d-asset-exporter/ui/AssetExporterSidebar.tsx` | pending | clean | eslint 4 |
| `src/domains/3d-asset-exporter/ui/AssetUploadZone.tsx` | pending | 28 viol | — |
| `src/domains/3d-asset-exporter/ui/ThreeDPanel.tsx` | pending | clean | — |
| `src/domains/3d-asset-exporter/ui/ThreeDViewer.tsx` | pending | 3 viol | — |
| `src/domains/__tests__/domain-conformance.ts` | pending | 68 viol | — |
| `src/domains/__tests__/domain-structure.test.ts` | pending | 17 viol | — |
| `src/domains/chat/core/mentions/context-builder.ts` | pending | 12 viol | — |
| `src/domains/chat/core/mentions/game-entity-provider.ts` | pending | 16 viol | — |
| `src/domains/chat/core/mentions/types.ts` | pending | 27 viol | — |
| `src/domains/chat/core/types.ts` | pending | 11 viol | — |
| `src/domains/chat/index.ts` | pending | clean | — |
| `src/domains/chat/state/useChatStream.test.ts` | pending | 81 viol | — |
| `src/domains/chat/state/useChatStream.ts` | pending | 124 viol | — |
| `src/domains/chat/ui/AgentLog.tsx` | pending | 79 viol | — |
| `src/domains/chat/ui/ChatInput.tsx` | pending | 17 viol | — |
| `src/domains/chat/ui/ChatInterface.tsx` | pending | 16 viol | — |
| `src/domains/chat/ui/CitationDisplay.tsx` | pending | 5 viol | — |
| `src/domains/chat/ui/MentionChip.tsx` | pending | 2 viol | — |
| `src/domains/chat/ui/ModelSelector.tsx` | pending | 1 viol | — |
| `src/domains/chat/ui/QuickActions.tsx` | pending | 80 viol | — |
| `src/domains/chat/ui/SectionProgress.tsx` | pending | 5 viol | — |
| `src/domains/chat/ui/StreamingSectionsInline.tsx` | pending | clean | — |
| `src/domains/chat/ui/StreamingTerminal.tsx` | pending | 1 viol | — |
| `src/domains/chat/ui/index.ts` | pending | clean | — |
| `src/domains/game-design/agents/GameDesignAgent.ts` | pending | 31 viol | — |
| `src/domains/game-design/agents/game-loop-workflow.ts` | pending | 29 viol | — |
| `src/domains/game-design/agents/memory.ts` | pending | 7 viol | — |
| `src/domains/game-design/agents/pattern-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/game-design/agents/tools/v2/haute-game-tools.ts` | pending | 41 viol | — |
| `src/domains/game-design/agents/tools/v2/logic-transformers.ts` | pending | 48 viol | — |
| `src/domains/game-design/agents/tools/v2/loop-tools.ts` | pending | 11 viol | — |
| `src/domains/game-design/core/schemas.ts` | pending | 53 viol | — |
| `src/domains/game-design/index.ts` | pending | clean | — |
| `src/domains/interior-designer/core/UnityExporter.ts` | pending | 23 viol | — |
| `src/domains/interior-designer/core/UnityYAML.ts` | pending | 2 viol | — |
| `src/domains/interior-designer/core/index.ts` | pending | clean | — |
| `src/domains/interior-designer/core/polygonUtils.ts` | pending | clean | eslint 7 |
| `src/domains/interior-designer/core/scene-element-guards.ts` | pending | 10 viol | — |
| `src/domains/interior-designer/core/textureCache.ts` | pending | clean | eslint 2 |
| `src/domains/interior-designer/core/vec3.ts` | pending | clean | — |
| `src/domains/interior-designer/index.ts` | pending | clean | — |
| `src/domains/interior-designer/interior-designer.config.ts` | pending | clean | — |
| `src/domains/interior-designer/io/index.ts` | pending | clean | — |
| `src/domains/interior-designer/io/interior-designer.api.ts` | pending | 8 viol | — |
| `src/domains/interior-designer/io/interior-designer.dto.ts` | pending | 1 viol | — |
| `src/domains/interior-designer/io/interior-designer.keys.ts` | pending | 9 viol | — |
| `src/domains/interior-designer/prompts/index.ts` | pending | 6 viol | — |
| `src/domains/interior-designer/services/TextureService.ts` | pending | 10 viol | — |
| `src/domains/interior-designer/services/index.ts` | pending | clean | — |
| `src/domains/interior-designer/state/index.ts` | pending | clean | — |
| `src/domains/interior-designer/state/queries/index.ts` | pending | clean | — |
| `src/domains/interior-designer/state/useInteriorStore.ts` | pending | 65 viol | — |
| `src/domains/interior-designer/tasks/index.ts` | pending | clean | — |
| `src/domains/interior-designer/ui/CameraController.tsx` | pending | 3 viol | — |
| `src/domains/interior-designer/ui/DesignManager.tsx` | pending | 8 viol | — |
| `src/domains/interior-designer/ui/Exporter.tsx` | pending | 3 viol | — |
| `src/domains/interior-designer/ui/FloorManager.tsx` | pending | 6 viol | — |
| `src/domains/interior-designer/ui/InteriorCanvas.tsx` | pending | clean | — |
| `src/domains/interior-designer/ui/InteriorDesignerWorkspace/InteriorDesignerWorkspace.tsx` | pending | 3 viol | — |
| `src/domains/interior-designer/ui/InteriorDesignerWorkspace/index.ts` | pending | clean | — |
| `src/domains/interior-designer/ui/KeybindingManager.tsx` | pending | 6 viol | — |
| `src/domains/interior-designer/ui/ObjectManager.tsx` | pending | 10 viol | — |
| `src/domains/interior-designer/ui/RetextureExporter.tsx` | pending | 9 viol | — |
| `src/domains/interior-designer/ui/SculptableSurface.tsx` | pending | 8 viol | — |
| `src/domains/interior-designer/ui/SurfaceManager.tsx` | pending | 26 viol | — |
| `src/domains/interior-designer/ui/TransformManager.tsx` | pending | 8 viol | — |
| `src/domains/interior-designer/ui/UI/AssetLibrary.tsx` | pending | 15 viol | — |
| `src/domains/interior-designer/ui/UI/InteriorRightSidebar.tsx` | pending | 11 viol | — |
| `src/domains/interior-designer/ui/UI/LayerPanel.tsx` | pending | 9 viol | — |
| `src/domains/interior-designer/ui/UI/PropertiesPanel.tsx` | pending | 93 viol | — |
| `src/domains/interior-designer/ui/UI/SurfaceProperties.tsx` | pending | 138 viol | — |
| `src/domains/interior-designer/ui/UI/TerrainEditorPanel.tsx` | pending | 19 viol | — |
| `src/domains/interior-designer/ui/UI/Toolbar.tsx` | pending | 16 viol | — |
| `src/domains/interior-designer/ui/VoxelTerrainMesh.tsx` | pending | clean | — |
| `src/domains/interior-designer/ui/WallManager.tsx` | pending | 3 viol | — |
| `src/domains/interior-designer/ui/index.ts` | pending | clean | — |
| `src/domains/interior-designer/ui/meshes/DoorMesh.tsx` | pending | 2 viol | — |
| `src/domains/interior-designer/ui/meshes/RoadMesh.tsx` | pending | 2 viol | — |
| `src/domains/interior-designer/ui/meshes/WindowMesh.tsx` | pending | 2 viol | — |
| `src/domains/interior-designer/ui/terrain/GlobalWaterPlane.tsx` | pending | 5 viol | — |
| `src/domains/interior-designer/ui/terrain/TerrainBrushPreview.tsx` | pending | 6 viol | — |
| `src/domains/interior-designer/ui/terrain/index.ts` | pending | clean | — |
| `src/domains/interior-designer/ui/tools/ObjectTool.tsx` | pending | 10 viol | — |
| `src/domains/interior-designer/ui/tools/ScatterTool.tsx` | pending | 1 viol | — |
| `src/domains/interior-designer/ui/tools/SurfaceTool.tsx` | pending | 21 viol | — |
| `src/domains/interior-designer/ui/tools/TerrainTool.tsx` | pending | 1 viol | — |
| `src/domains/interior-designer/ui/tools/WallTool.tsx` | pending | 4 viol | — |
| `src/domains/loop-creator/agents/balance-analyst.ts` | pending | 27 viol | — |
| `src/domains/loop-creator/agents/concept-evaluator.ts` | pending | 33 viol | — |
| `src/domains/loop-creator/agents/loop-planner.ts` | pending | 84 viol | — |
| `src/domains/loop-creator/agents/market-analyst-wrapper.ts` | pending | 11 viol | — |
| `src/domains/loop-creator/agents/market-analyst/index.ts` | pending | 31 viol | — |
| `src/domains/loop-creator/agents/market-analyst/market-analysis-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/agents/market-analyst/prompts.ts` | pending | 50 viol | — |
| `src/domains/loop-creator/agents/market-analyst/tools-registry.ts` | pending | clean | — |
| `src/domains/loop-creator/agents/market-analyst/tools/audience-analyzer.ts` | pending | 398 viol | — |
| `src/domains/loop-creator/agents/market-analyst/tools/competitor-finder.ts` | pending | 353 viol | — |
| `src/domains/loop-creator/agents/market-analyst/tools/game-database.ts` | pending | 134 viol | — |
| `src/domains/loop-creator/agents/market-analyst/tools/market-momentum.ts` | pending | 245 viol | — |
| `src/domains/loop-creator/agents/market-analyst/tools/market-size.ts` | pending | 50 viol | — |
| `src/domains/loop-creator/agents/market-analyst/tools/metrics-planner.ts` | pending | 379 viol | — |
| `src/domains/loop-creator/agents/market-analyst/tools/pattern-matcher.ts` | pending | 385 viol | — |
| `src/domains/loop-creator/agents/market-analyst/tools/reddit-pulse.ts` | pending | 214 viol | — |
| `src/domains/loop-creator/agents/market-analyst/tools/report-generator.ts` | pending | 41 viol | — |
| `src/domains/loop-creator/agents/market-analyst/tools/scorers/best-match.ts` | pending | 191 viol | — |
| `src/domains/loop-creator/agents/market-analyst/tools/scorers/counter-strike.ts` | pending | 194 viol | — |
| `src/domains/loop-creator/agents/market-analyst/tools/scorers/disco-elysium.ts` | pending | 156 viol | — |
| `src/domains/loop-creator/agents/market-analyst/tools/scorers/vampire-survivors.ts` | pending | 188 viol | — |
| `src/domains/loop-creator/agents/market-analyst/tools/steam-charts.ts` | pending | 30 viol | — |
| `src/domains/loop-creator/agents/market-analyst/tools/steam-trending.ts` | pending | 221 viol | — |
| `src/domains/loop-creator/agents/market-analyst/tools/trend-analyzer.ts` | pending | 90 viol | — |
| `src/domains/loop-creator/agents/market-analyst/tools/twitter-trends.ts` | pending | 184 viol | — |
| `src/domains/loop-creator/agents/market-analyst/tools/web-search.ts` | pending | 39 viol | — |
| `src/domains/loop-creator/agents/market-analyst/types.ts` | pending | clean | — |
| `src/domains/loop-creator/agents/mechanics-designer.ts` | pending | 39 viol | — |
| `src/domains/loop-creator/agents/progression-architect.ts` | pending | 28 viol | — |
| `src/domains/loop-creator/agents/supervisor.ts` | pending | 29 viol | — |
| `src/domains/loop-creator/core/graph/agent-nodes.ts` | pending | 16 viol | — |
| `src/domains/loop-creator/core/graph/loop-graph.ts` | pending | clean | — |
| `src/domains/loop-creator/core/graph/loop-orchestrator.ts` | pending | 30 viol | — |
| `src/domains/loop-creator/core/graph/state.ts` | pending | 5 viol | — |
| `src/domains/loop-creator/core/layout.ts` | pending | 10 viol | — |
| `src/domains/loop-creator/core/loop-agent-action-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/core/loop-node-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/core/mentions/providers.ts` | pending | 67 viol | — |
| `src/domains/loop-creator/index.ts` | pending | clean | — |
| `src/domains/loop-creator/server.ts` | pending | clean | — |
| `src/domains/loop-creator/state/useAutoSave.ts` | pending | 9 viol | — |
| `src/domains/loop-creator/ui/CustomNodes.tsx` | pending | 19 viol | — |
| `src/domains/loop-creator/ui/LoopCreatorLayout.tsx` | pending | 134 viol | — |
| `src/domains/loop-creator/ui/LoopEmptyState.tsx` | pending | clean | — |
| `src/domains/loop-creator/ui/LoopSelector.tsx` | pending | 21 viol | — |
| `src/domains/loop-creator/ui/MarketAnalysisPanel.tsx` | pending | 19 viol | — |
| `src/domains/loop-creator/ui/PropertiesPanel.tsx` | pending | 35 viol | — |
| `src/domains/loop-creator/ui/SuggestionPanel.tsx` | pending | clean | eslint 1 |
| `src/domains/marketing/core/legal-docs.ts` | pending | 5 viol | — |
| `src/domains/marketing/index.ts` | pending | clean | — |
| `src/domains/marketing/state/LiquidContext.tsx` | pending | 1 viol | — |
| `src/domains/marketing/ui/GlobalLiquidLoader.tsx` | pending | 1 viol | — |
| `src/domains/marketing/ui/LandingPage.tsx` | pending | 65 viol | — |
| `src/domains/marketing/ui/LegalMarkdownPage.tsx` | pending | clean | — |
| `src/domains/marketing/ui/Liquid.tsx` | pending | 1 viol | — |
| `src/domains/marketing/ui/LiquidBackgroundProvider.tsx` | pending | 1 viol | — |
| `src/domains/marketing/ui/ProPlanPromo.tsx` | pending | clean | — |
| `src/domains/marketing/ui/ThreeDIcon.tsx` | pending | 25 viol | — |
| `src/domains/marketing/ui/ToolsIntegration.tsx` | pending | clean | — |
| `src/domains/marketing/ui/TurbulentBackground.tsx` | pending | 4 viol | — |
| `src/domains/storyteller/agents/BeatPlanner/BeatPlannerAgent.ts` | pending | 11 viol | — |
| `src/domains/storyteller/agents/BeatPlanner/__tests__/beat-plan-quality.test.ts` | pending | 30 viol | — |
| `src/domains/storyteller/agents/BeatPlanner/beat-plan-concreteness-scorer.ts` | pending | 4 viol | — |
| `src/domains/storyteller/agents/BeatPlanner/beat-plan-quality.ts` | pending | 4 viol | — |
| `src/domains/storyteller/agents/BeatPlanner/beat-plan-schema.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/agents/GrrmAuthor/GrrmAuthorAgent.ts` | pending | 10 viol | — |
| `src/domains/storyteller/agents/StorytellerAgent/StorytellerAgent.ts` | pending | 15 viol | — |
| `src/domains/storyteller/agents/StorytellerAgent/index.ts` | pending | clean | — |
| `src/domains/storyteller/agents/critics/ContinuityCritic.ts` | pending | 4 viol | — |
| `src/domains/storyteller/agents/critics/ProseCritic.ts` | pending | 4 viol | — |
| `src/domains/storyteller/agents/critics/StakesCritic.ts` | pending | 4 viol | — |
| `src/domains/storyteller/agents/critics/critic-discipline-scorer.ts` | pending | 18 viol | — |
| `src/domains/storyteller/agents/critics/critic-rules.ts` | pending | clean | — |
| `src/domains/storyteller/agents/critics/critic-schema.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/agents/critics/index.ts` | pending | clean | — |
| `src/domains/storyteller/agents/critics/run-critic.ts` | pending | clean | — |
| `src/domains/storyteller/agents/index.ts` | pending | clean | — |
| `src/domains/storyteller/agents/request-context.ts` | pending | clean | — |
| `src/domains/storyteller/agents/tools/beat-tools.ts` | pending | 31 viol | — |
| `src/domains/storyteller/agents/tools/bible-tools.ts` | pending | 37 viol | — |
| `src/domains/storyteller/agents/tools/character-tools.ts` | pending | 39 viol | — |
| `src/domains/storyteller/agents/tools/episode-tools.ts` | pending | 28 viol | — |
| `src/domains/storyteller/agents/tools/index.ts` | pending | clean | — |
| `src/domains/storyteller/agents/tools/workflow-tool.ts` | pending | 17 viol | — |
| `src/domains/storyteller/agents/tracing.ts` | pending | 1 viol | — |
| `src/domains/storyteller/agents/workflows/__tests__/beat-draft-workflow.e2e.test.ts` | pending | 14 viol | — |
| `src/domains/storyteller/agents/workflows/__tests__/beat-draft-workflow.test.ts` | pending | 62 viol | — |
| `src/domains/storyteller/agents/workflows/beat-draft-contract.ts` | pending | clean | — |
| `src/domains/storyteller/agents/workflows/beat-draft-workflow.ts` | pending | 23 viol | — |
| `src/domains/storyteller/agents/workflows/stateless-agents.ts` | pending | 8 viol | — |
| `src/domains/storyteller/config/ChatModelCatalog.ts` | pending | 30 viol | — |
| `src/domains/storyteller/config/ModelConfig.ts` | clean | 65 viol | — |
| `src/domains/storyteller/config/__tests__/tool-result-mapper.test.ts` | pending | 57 viol | — |
| `src/domains/storyteller/config/action-config.ts` | pending | 48 viol | — |
| `src/domains/storyteller/config/storyteller-agents.tsx` | pending | 3 viol | — |
| `src/domains/storyteller/config/storyteller-config.ts` | pending | 36 viol | — |
| `src/domains/storyteller/config/tool-result-mapper.ts` | pending | 55 viol | — |
| `src/domains/storyteller/core/editing/CascadeEditor.ts` | pending | 22 viol | — |
| `src/domains/storyteller/core/editing/DeepMerge.ts` | pending | clean | — |
| `src/domains/storyteller/core/editing/UndoManager.ts` | pending | 2 viol | — |
| `src/domains/storyteller/core/editing/index.ts` | pending | clean | eslint 3 |
| `src/domains/storyteller/core/entities/EntityExtractor.ts` | pending | 8 viol | — |
| `src/domains/storyteller/core/entities/EntityReferences.ts` | pending | clean | — |
| `src/domains/storyteller/core/entities/ReferenceParser.ts` | pending | 21 viol | — |
| `src/domains/storyteller/core/entities/character-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/entities/entity-type-guards.ts` | pending | 8 viol | — |
| `src/domains/storyteller/core/entities/index.ts` | pending | clean | — |
| `src/domains/storyteller/core/entities/story-plan-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/entities/world-rule-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/formatting/ActionFormatters.ts` | pending | 91 viol | — |
| `src/domains/storyteller/core/formatting/StoryPlanFields.ts` | pending | 8 viol | — |
| `src/domains/storyteller/core/formatting/index.ts` | pending | clean | eslint 2 |
| `src/domains/storyteller/core/index.ts` | pending | clean | eslint 5 |
| `src/domains/storyteller/core/types/ActionTypes.ts` | pending | clean | — |
| `src/domains/storyteller/core/types/ConsistencyTypes.ts` | pending | clean | eslint 8 |
| `src/domains/storyteller/core/types/Enums.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/types/StoryPlanTypes.ts` | pending | clean | — |
| `src/domains/storyteller/core/types/StoryTypes.ts` | pending | clean | eslint 5 |
| `src/domains/storyteller/core/types/index.ts` | pending | clean | eslint 5 |
| `src/domains/storyteller/core/utils/index.ts` | pending | clean | eslint 1 |
| `src/domains/storyteller/core/utils/youtube-utils.ts` | pending | clean | — |
| `src/domains/storyteller/db/schema.ts` | pending | 152 viol | — |
| `src/domains/storyteller/index.ts` | pending | clean | — |
| `src/domains/storyteller/io/mastra-runtime.ts` | pending | clean | — |
| `src/domains/storyteller/io/storyteller.api.ts` | pending | clean | — |
| `src/domains/storyteller/io/storyteller.dto.ts` | pending | clean | — |
| `src/domains/storyteller/io/storyteller.keys.ts` | pending | 5 viol | — |
| `src/domains/storyteller/prompts/GrrmSystemPrompt.ts` | pending | clean | — |
| `src/domains/storyteller/prompts/beat-planner-prompt.ts` | pending | clean | — |
| `src/domains/storyteller/prompts/chat-adapter-prompt.ts` | pending | clean | — |
| `src/domains/storyteller/prompts/guardrails/anti-slop-phrases.ts` | pending | 71 viol | — |
| `src/domains/storyteller/prompts/schemas/agent-schemas.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/prompts/types.ts` | pending | clean | — |
| `src/domains/storyteller/server.ts` | pending | clean | — |
| `src/domains/storyteller/services/AccessVerificationService.ts` | pending | 3 viol | — |
| `src/domains/storyteller/services/BeatImageService.ts` | pending | 16 viol | — |
| `src/domains/storyteller/services/ConsistencyCheckAdapter.ts` | pending | 8 viol | — |
| `src/domains/storyteller/services/ConsistencyService.ts` | pending | 15 viol | — |
| `src/domains/storyteller/services/ContextAssemblyService.ts` | pending | 47 viol | — |
| `src/domains/storyteller/services/ContextualSummaryService.ts` | pending | 5 viol | — |
| `src/domains/storyteller/services/EntityAutoLinkerService.ts` | pending | 25 viol | — |
| `src/domains/storyteller/services/EntityGraphService.ts` | pending | 69 viol | — |
| `src/domains/storyteller/services/EntityLoaderService.ts` | pending | 1 viol | — |
| `src/domains/storyteller/services/EntityRegistryService.ts` | pending | 12 viol | — |
| `src/domains/storyteller/services/MoodboardGenerationService.ts` | pending | 24 viol | — |
| `src/domains/storyteller/services/PosterGenerationService.ts` | pending | 40 viol | — |
| `src/domains/storyteller/services/RagService.ts` | pending | 15 viol | — |
| `src/domains/storyteller/services/ReferenceValidatorService.ts` | pending | clean | eslint 1 |
| `src/domains/storyteller/services/RelationshipEnricherService.ts` | pending | 53 viol | — |
| `src/domains/storyteller/services/ScriptOperationsService.ts` | pending | 5 viol | — |
| `src/domains/storyteller/services/ScriptReviewService.ts` | pending | 9 viol | — |
| `src/domains/storyteller/services/StorytellerCrudService.ts` | pending | 27 viol | — |
| `src/domains/storyteller/services/consistency-types.ts` | pending | clean | eslint 1 |
| `src/domains/storyteller/services/context/SeriesBible.ts` | pending | 44 viol | — |
| `src/domains/storyteller/services/context/token-budget.ts` | pending | 10 viol | — |
| `src/domains/storyteller/state/hooks/useLoadingStates.ts` | pending | 12 viol | — |
| `src/domains/storyteller/state/hooks/useStorytellerHydration.ts` | pending | 28 viol | — |
| `src/domains/storyteller/state/queries/useBibleLock.ts` | pending | clean | eslint 1 |
| `src/domains/storyteller/state/queries/useBibleState.ts` | pending | 21 viol | — |
| `src/domains/storyteller/state/queries/useEntity.ts` | pending | clean | — |
| `src/domains/storyteller/state/queries/useEpisodeData.ts` | pending | 4 viol | — |
| `src/domains/storyteller/state/queries/useEpisodes.ts` | pending | clean | eslint 2 |
| `src/domains/storyteller/state/queries/useStorytellerActions.ts` | pending | 26 viol | — |
| `src/domains/storyteller/storyteller.config.ts` | pending | clean | eslint 1 |
| `src/domains/storyteller/tasks/generate-combined-storyboard.task.ts` | pending | 28 viol | — |
| `src/domains/storyteller/tasks/generate-episode-poster.task.ts` | pending | 30 viol | — |
| `src/domains/storyteller/tasks/generate-moodboard.task.ts` | pending | 99 viol | — |
| `src/domains/storyteller/tasks/generate-portrait.task.ts` | pending | 14 viol | — |
| `src/domains/storyteller/tasks/generate-poster.task.ts` | pending | 14 viol | — |
| `src/domains/storyteller/tasks/generate-storyboard.task.ts` | pending | 30 viol | — |
| `src/domains/storyteller/tasks/select-portrait-variant.task.ts` | pending | 22 viol | — |
| `src/domains/storyteller/tasks/upload-asset.task.ts` | pending | 28 viol | — |
| `src/domains/storyteller/ui/ActionApprovalModal/ActionApprovalModal.tsx` | pending | 221 viol | — |
| `src/domains/storyteller/ui/ActionApprovalModal/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/ActionToast/ActionToast.tsx` | pending | 8 viol | — |
| `src/domains/storyteller/ui/ActionToast/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/AgentLog/AgentLog.tsx` | pending | 48 viol | — |
| `src/domains/storyteller/ui/AgentLog/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/BeatCard/BeatCard.tsx` | pending | 20 viol | — |
| `src/domains/storyteller/ui/BeatCard/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/CharacterCreationDialog/CharacterCreationDialog.tsx` | pending | 21 viol | — |
| `src/domains/storyteller/ui/CharacterCreationDialog/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/CharacterPanel/CharacterPanel.tsx` | pending | 64 viol | — |
| `src/domains/storyteller/ui/CharacterPanel/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/CharacterWeb/CharacterNode.tsx` | pending | 10 viol | — |
| `src/domains/storyteller/ui/CharacterWeb/CharacterWeb.tsx` | pending | 38 viol | — |
| `src/domains/storyteller/ui/CharacterWeb/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/CharacterWeb/types.ts` | pending | 61 viol | — |
| `src/domains/storyteller/ui/ConsistencyMessage/ConsistencyMessage.tsx` | pending | 6 viol | — |
| `src/domains/storyteller/ui/ConsistencyMessage/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/CorkBoard/CorkBoard.tsx` | pending | 17 viol | — |
| `src/domains/storyteller/ui/CorkBoard/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/EpisodeManager/EpisodeManager.tsx` | pending | 19 viol | — |
| `src/domains/storyteller/ui/EpisodeManager/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/EpisodePremisePanel/EpisodePremisePanel.tsx` | pending | 13 viol | — |
| `src/domains/storyteller/ui/EpisodePremisePanel/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/EpisodeRoadmapCard/EpisodeRoadmapCard.tsx` | pending | 11 viol | — |
| `src/domains/storyteller/ui/EpisodeRoadmapCard/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/FactionCard/FactionCard.tsx` | clean | clean | — |
| `src/domains/storyteller/ui/FactionCard/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/ImageVariantSelector/ImageVariantSelector.tsx` | pending | 10 viol | — |
| `src/domains/storyteller/ui/ImageVariantSelector/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/JSONDiffViewer/JSONDiffViewer.tsx` | pending | 10 viol | — |
| `src/domains/storyteller/ui/JSONDiffViewer/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/MasterPromptEditor/MasterPromptEditor.tsx` | pending | 1 viol | — |
| `src/domains/storyteller/ui/MasterPromptEditor/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/MentionsProvider/MentionsProvider.tsx` | pending | 1 viol | — |
| `src/domains/storyteller/ui/MentionsProvider/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/MentionsProvider/providers.ts` | pending | 88 viol | — |
| `src/domains/storyteller/ui/PhaseNavigator/PhaseNavigator.tsx` | pending | 24 viol | — |
| `src/domains/storyteller/ui/PhaseNavigator/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/QuestionCard/QuestionCard.tsx` | pending | 11 viol | — |
| `src/domains/storyteller/ui/QuestionCard/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/ReferenceText/ReferenceText.tsx` | pending | 53 viol | — |
| `src/domains/storyteller/ui/ReferenceText/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/RichText/RichText.tsx` | pending | 4 viol | — |
| `src/domains/storyteller/ui/RichText/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/ScriptEditor/ScriptEditor.tsx` | pending | 9 viol | — |
| `src/domains/storyteller/ui/ScriptEditor/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/SeasonOverviewCard/SeasonOverviewCard.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/SeasonOverviewCard/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/StoryPlanBoard/StoryPlanBoard.tsx` | pending | 11 viol | — |
| `src/domains/storyteller/ui/StoryPlanBoard/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/StorytellerEmptyState/StorytellerEmptyState.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/StorytellerEmptyState/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/StorytellerImage/StorytellerImage.tsx` | pending | 2 viol | — |
| `src/domains/storyteller/ui/StorytellerImage/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/Timeline/Timeline.tsx` | pending | 10 viol | — |
| `src/domains/storyteller/ui/Timeline/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/WorldBible/BibleContext.tsx` | pending | 13 viol | — |
| `src/domains/storyteller/ui/WorldBible/BibleEvents.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/WorldBible/BibleFactions.tsx` | pending | clean | eslint 1 |
| `src/domains/storyteller/ui/WorldBible/BibleInspirations.tsx` | pending | 11 viol | — |
| `src/domains/storyteller/ui/WorldBible/BibleItems.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/WorldBible/BibleOverview.tsx` | pending | 1 viol | — |
| `src/domains/storyteller/ui/WorldBible/BibleRoadmap.tsx` | pending | 1 viol | — |
| `src/domains/storyteller/ui/WorldBible/BibleSoundtracks.tsx` | pending | clean | eslint 1 |
| `src/domains/storyteller/ui/WorldBible/BibleWorldLogic.tsx` | pending | clean | eslint 1 |
| `src/domains/storyteller/ui/WorldBible/SectionPendingOverlay.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/WorldBiblePanel/WorldBiblePanel.tsx` | pending | 28 viol | — |
| `src/domains/storyteller/ui/WorldBiblePanel/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/WorldRuleCard/WorldRuleCard.tsx` | pending | 19 viol | — |
| `src/domains/storyteller/ui/WorldRuleCard/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/YouTubePlayer/YouTubePlayer.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/YouTubePlayer/index.ts` | pending | clean | — |
| `src/domains/world-building-toolkit/core/rle.ts` | pending | 4 viol | — |
| `src/domains/world-building-toolkit/core/upscale-provider-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/core/world-types.ts` | pending | clean | — |
| `src/domains/world-building-toolkit/index.ts` | pending | clean | — |
| `src/domains/world-building-toolkit/io/world.api.ts` | pending | 7 viol | — |
| `src/domains/world-building-toolkit/io/world.dto.ts` | pending | clean | eslint 3 |
| `src/domains/world-building-toolkit/io/world.keys.ts` | pending | 4 viol | — |
| `src/domains/world-building-toolkit/services/WorldDataService.ts` | pending | clean | — |
| `src/domains/world-building-toolkit/state/client-services/FidelityService.ts` | pending | 31 viol | — |
| `src/domains/world-building-toolkit/state/client-services/RepaintService.ts` | pending | 33 viol | — |
| `src/domains/world-building-toolkit/state/client-services/SelectModeService.ts` | pending | 67 viol | — |
| `src/domains/world-building-toolkit/state/client-services/TileGenerationService.ts` | pending | 37 viol | — |
| `src/domains/world-building-toolkit/state/client-services/UpscaleService.ts` | pending | 51 viol | — |
| `src/domains/world-building-toolkit/state/queries/useWorldData.ts` | pending | 6 viol | — |
| `src/domains/world-building-toolkit/state/useWorldStore.ts` | pending | 37 viol | — |
| `src/domains/world-building-toolkit/state/useWorldUiStore.ts` | pending | 3 viol | — |
| `src/domains/world-building-toolkit/tasks/enhance-fidelity.task.ts` | pending | 54 viol | — |
| `src/domains/world-building-toolkit/tasks/generate-tile.task.ts` | pending | 292 viol | — |
| `src/domains/world-building-toolkit/tasks/select-mj-variant.task.ts` | pending | 20 viol | — |
| `src/domains/world-building-toolkit/tasks/upscale-tile.task.ts` | pending | 123 viol | — |
| `src/domains/world-building-toolkit/ui/AssetsPanel.tsx` | pending | 9 viol | — |
| `src/domains/world-building-toolkit/ui/Canvas/RepaintCanvas.tsx` | pending | 6 viol | — |
| `src/domains/world-building-toolkit/ui/Canvas/Tile.tsx` | pending | 15 viol | — |
| `src/domains/world-building-toolkit/ui/Canvas/WorldCanvas.tsx` | pending | 12 viol | — |
| `src/domains/world-building-toolkit/ui/MjVariantPicker.tsx` | pending | 10 viol | — |
| `src/domains/world-building-toolkit/ui/RepaintToolbar.tsx` | pending | 5 viol | — |
| `src/domains/world-building-toolkit/ui/SelectModeToolbar.tsx` | pending | 6 viol | — |
| `src/domains/world-building-toolkit/ui/SettingsDialog.tsx` | pending | 23 viol | — |
| `src/domains/world-building-toolkit/ui/Sidebar/Sidebar.tsx` | pending | 31 viol | — |
| `src/domains/world-building-toolkit/ui/TileReviewDialog.tsx` | pending | 42 viol | — |
| `src/domains/world-building-toolkit/ui/WorldGenToolbar.tsx` | pending | 10 viol | — |
| `src/domains/world-building-toolkit/world-building-toolkit.config.ts` | pending | clean | — |
| `src/mastra/index.ts` | pending | clean | — |
| `src/mcp/agent.ts` | pending | 3 viol | — |
| `src/mcp/core/auth.ts` | pending | 22 viol | — |
| `src/mcp/core/request-context.test.ts` | pending | 27 viol | — |
| `src/mcp/core/request-context.ts` | pending | 2 viol | — |
| `src/mcp/core/types.ts` | pending | clean | eslint 2 |
| `src/mcp/domains/entities/tools.ts` | pending | 40 viol | — |
| `src/mcp/domains/generation/tools.ts` | pending | 40 viol | — |
| `src/mcp/domains/storyteller/tools.ts` | pending | 69 viol | — |
| `src/mcp/domains/trigger/tools.ts` | pending | 24 viol | — |
| `src/mcp/env.ts` | pending | 1 viol | — |
| `src/mcp/resources/index.ts` | pending | 30 viol | — |
| `src/mcp/server.ts` | pending | 3 viol | — |
| `src/mcp/stdio.ts` | pending | 1 viol | — |
| `src/shared/agent-kernel/MastraInstance.ts` | pending | 3 viol | — |
| `src/shared/agent-kernel/action-wire.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/agents/agent-response.ts` | pending | clean | — |
| `src/shared/agent-kernel/context/cross-domain-context.ts` | pending | 11 viol | — |
| `src/shared/agent-kernel/cursor-runner.ts` | pending | 50 viol | — |
| `src/shared/agent-kernel/executive.ts` | pending | 25 viol | — |
| `src/shared/agent-kernel/index.ts` | pending | clean | eslint 2 |
| `src/shared/agent-kernel/mastra/agents/registry.ts` | pending | 21 viol | — |
| `src/shared/agent-kernel/mastra/create-mastra.ts` | pending | 17 viol | — |
| `src/shared/agent-kernel/mastra/index.ts` | pending | 4 viol | — |
| `src/shared/agent-kernel/mastra/mcp/studio-servers.ts` | pending | 62 viol | — |
| `src/shared/agent-kernel/mastra/runtime-registry.ts` | pending | 4 viol | — |
| `src/shared/agent-kernel/mastra/tools/bundles.ts` | pending | 108 viol | — |
| `src/shared/agent-kernel/memory/agent-memory.ts` | pending | 7 viol | — |
| `src/shared/agent-kernel/models.ts` | pending | 102 viol | — |
| `src/shared/agent-kernel/persistence/memory-store.ts` | pending | clean | — |
| `src/shared/agent-kernel/planner.ts` | pending | 18 viol | — |
| `src/shared/agent-kernel/prompts/registry.ts` | pending | 101 viol | — |
| `src/shared/agent-kernel/prompts/repository.ts` | pending | 1 viol | — |
| `src/shared/agent-kernel/prompts/types.ts` | pending | clean | — |
| `src/shared/agent-kernel/schemas.ts` | pending | 13 viol | — |
| `src/shared/agent-kernel/scorers/__tests__/scorers.test.ts` | pending | 20 viol | — |
| `src/shared/agent-kernel/scorers/consistency-scorer.ts` | pending | 7 viol | — |
| `src/shared/agent-kernel/scorers/hallucination-scorer.ts` | pending | 6 viol | — |
| `src/shared/agent-kernel/scorers/index.ts` | pending | clean | — |
| `src/shared/agent-kernel/scorers/magic-scorer.ts` | pending | 6 viol | — |
| `src/shared/agent-kernel/scorers/persona-fidelity-scorer.ts` | pending | 7 viol | — |
| `src/shared/agent-kernel/scorers/prose-craft-scorer.ts` | pending | 8 viol | — |
| `src/shared/agent-kernel/scorers/shared.ts` | pending | 3 viol | — |
| `src/shared/agent-kernel/scorers/stakes-cost-scorer.ts` | pending | 9 viol | — |
| `src/shared/agent-kernel/search/hybrid-search.ts` | pending | 8 viol | — |
| `src/shared/agent-kernel/search/index.ts` | pending | clean | — |
| `src/shared/agent-kernel/skills/eval-schema.ts` | pending | clean | — |
| `src/shared/agent-kernel/skills/index.ts` | pending | clean | — |
| `src/shared/agent-kernel/skills/skill-loader.ts` | pending | 11 viol | — |
| `src/shared/agent-kernel/workflows/human-loop-workflow.ts` | pending | 4 viol | — |
| `src/shared/agent-kernel/workflows/schema.ts` | pending | clean | eslint 2 |
| `src/shared/agent-kernel/workspace/index.ts` | pending | clean | — |
| `src/shared/agent-kernel/workspace/script-artifact-wire.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/workspace/storyteller-workspace.ts` | pending | 48 viol | — |
| `src/shared/ai/ai-provider-config.ts` | pending | 1 viol | — |
| `src/shared/ai/contextAssembler.ts` | pending | 74 viol | — |
| `src/shared/ai/contextAssemblerWorker.ts` | pending | 67 viol | — |
| `src/shared/ai/embeddings/voyage-embeddings.ts` | pending | 19 viol | — |
| `src/shared/ai/fal.ts` | pending | 5 viol | — |
| `src/shared/ai/gateway/gateway.ts` | pending | 2 viol | — |
| `src/shared/ai/gateway/types.ts` | pending | clean | — |
| `src/shared/ai/index.ts` | pending | clean | — |
| `src/shared/ai/legnext.ts` | pending | 7 viol | — |
| `src/shared/ai/meshy.ts` | pending | 27 viol | — |
| `src/shared/ai/rag/hybrid-search.ts` | pending | 2 viol | — |
| `src/shared/ai/rag/query-expander.ts` | pending | 104 viol | — |
| `src/shared/ai/rag/reranker.ts` | pending | 9 viol | — |
| `src/shared/ai/rag/semantic-chunker.ts` | pending | 28 viol | — |
| `src/shared/ai/replicate-output.ts` | pending | 14 viol | — |
| `src/shared/ai/replicate.ts` | pending | 9 viol | — |
| `src/shared/ai/types.ts` | pending | clean | eslint 1 |
| `src/shared/auth/admin-users.tsx` | pending | 1 viol | — |
| `src/shared/auth/auth.ts` | pending | 12 viol | — |
| `src/shared/auth/bible-permissions.ts` | pending | 1 viol | — |
| `src/shared/auth/index.ts` | pending | clean | — |
| `src/shared/auth/security.ts` | pending | 61 viol | — |
| `src/shared/auth/supabase-admin.ts` | pending | 1 viol | — |
| `src/shared/auth/supabase-route-client.ts` | pending | clean | — |
| `src/shared/auth/useAuthStore.ts` | pending | clean | — |
| `src/shared/auth/validation.ts` | pending | 11 viol | — |
| `src/shared/data/EntitiesService.ts` | pending | 36 viol | — |
| `src/shared/data/api-utils.ts` | pending | 16 viol | — |
| `src/shared/data/chat-persistence.ts` | pending | 8 viol | — |
| `src/shared/data/constants/index.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/localStorage.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/polling.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/style-presets.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/visuals.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/worldPromptIdeas.ts` | exempt | exempt | wire/schema |
| `src/shared/data/count-occurrences.ts` | pending | clean | — |
| `src/shared/data/deep-merge.ts` | pending | 4 viol | — |
| `src/shared/data/fetch-cache.ts` | pending | clean | — |
| `src/shared/data/form-data-guards.ts` | pending | clean | — |
| `src/shared/data/generation/TilesService.ts` | pending | 37 viol | — |
| `src/shared/data/index.ts` | pending | clean | — |
| `src/shared/data/json-guards.ts` | pending | 2 viol | — |
| `src/shared/data/queries/useGameEntities.ts` | pending | 20 viol | — |
| `src/shared/data/react-query.tsx` | pending | clean | — |
| `src/shared/data/seedFromString.ts` | pending | clean | — |
| `src/shared/data/server/image-service.ts` | pending | 27 viol | — |
| `src/shared/data/server/prompts.ts` | pending | 12 viol | — |
| `src/shared/data/storage/StorageService.ts` | pending | 39 viol | — |
| `src/shared/data/storage/database.types.ts` | pending | clean | — |
| `src/shared/data/storage/index.ts` | pending | clean | — |
| `src/shared/data/storage/supabase.ts` | pending | 1 viol | — |
| `src/shared/data/storage/supabaseClient.ts` | pending | clean | — |
| `src/shared/data/trace-session.ts` | pending | clean | — |
| `src/shared/data/url.ts` | pending | 3 viol | — |
| `src/shared/data/useProjectFromUrl.ts` | pending | 6 viol | — |
| `src/shared/data/utils.ts` | pending | clean | — |
| `src/shared/errors/error-utils.ts` | pending | 1 viol | — |
| `src/shared/errors/index.ts` | pending | clean | — |
| `src/shared/errors/useErrorStore.ts` | pending | clean | eslint 1 |
| `src/shared/jobs/index.ts` | pending | clean | — |
| `src/shared/jobs/useGlobalStatusStore.ts` | pending | 5 viol | — |
| `src/shared/observability/index.ts` | pending | clean | — |
| `src/shared/observability/observability.ts` | pending | 8 viol | — |
| `src/shared/tours/asset-exporter-tour.tsx` | pending | 6 viol | — |
| `src/shared/tours/index.ts` | pending | clean | — |
| `src/shared/tours/interior-designer-tour.tsx` | pending | 5 viol | — |
| `src/shared/tours/loop-creator-tour.tsx` | pending | 4 viol | — |
| `src/shared/tours/module-tours.ts` | pending | 10 viol | — |
| `src/shared/tours/storyteller-tour.tsx` | pending | 5 viol | — |
| `src/shared/tours/tour-constants.ts` | pending | 36 viol | — |
| `src/shared/tours/tour-types.ts` | pending | clean | — |
| `src/shared/tours/world-gen-tour.tsx` | pending | 5 viol | — |
| `src/shared/types/enums.ts` | exempt | exempt | wire/schema |
| `src/shared/types/index.ts` | pending | clean | — |
| `src/shared/types/onboarding.ts` | pending | 5 viol | — |
| `src/shared/types/three-jsx.d.ts` | exempt | exempt | wire/schema |
| `src/trigger/cursor-execute.task.ts` | pending | 5 viol | — |
| `src/trigger/index.ts` | pending | clean | — |
| `src/trigger/providers/follow-up-provider.ts` | pending | 6 viol | — |
| `src/trigger/providers/legnext-upload-paint.ts` | pending | 2 viol | — |
| `src/trigger/utils/llm-logger.ts` | pending | 24 viol | — |
