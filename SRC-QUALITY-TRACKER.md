# src/ quality tracker

Generated: 2026-07-14 13:27:10 · **1078 files** in `src/**`

| Metric | clean | errors | pending | exempt |
|--------|------:|-------:|--------:|-------:|
| TSC | 32 | 1 | 620 | 425 |
| MagicStr | 653 | 0 | 0 | 425 |

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
| `src/__tests__/src-topology.ts` | pending | clean | — |
| `src/__tests__/structure.test.ts` | pending | clean | — |
| `src/app/(auth)/auth/callback/route.ts` | pending | clean | — |
| `src/app/(auth)/auth/reset-password/page.tsx` | pending | clean | — |
| `src/app/(auth)/constants/auth-styles.ts` | exempt | exempt | wire/schema |
| `src/app/(auth)/login/layout.tsx` | pending | clean | — |
| `src/app/(auth)/login/page.tsx` | pending | clean | — |
| `src/app/(marketing)/page.tsx` | pending | clean | — |
| `src/app/(marketing)/privacy/page.tsx` | pending | clean | — |
| `src/app/(marketing)/terms/page.tsx` | pending | clean | — |
| `src/app/(workspace)/[projectId]/asset-exporter/layout.tsx` | pending | clean | — |
| `src/app/(workspace)/[projectId]/asset-exporter/page.tsx` | pending | clean | — |
| `src/app/(workspace)/[projectId]/interior-design/layout.tsx` | pending | clean | — |
| `src/app/(workspace)/[projectId]/interior-design/page.tsx` | pending | clean | — |
| `src/app/(workspace)/[projectId]/layout.tsx` | pending | clean | — |
| `src/app/(workspace)/[projectId]/loop-creator/layout.tsx` | pending | clean | — |
| `src/app/(workspace)/[projectId]/loop-creator/page.tsx` | pending | clean | — |
| `src/app/(workspace)/[projectId]/page.tsx` | pending | clean | — |
| `src/app/(workspace)/[projectId]/storyteller/layout.tsx` | pending | clean | — |
| `src/app/(workspace)/[projectId]/storyteller/page.tsx` | pending | clean | — |
| `src/app/(workspace)/[projectId]/world-gen/layout.tsx` | pending | clean | — |
| `src/app/(workspace)/[projectId]/world-gen/page.tsx` | pending | clean | eslint 1 |
| `src/app/(workspace)/layout.tsx` | pending | clean | — |
| `src/app/(workspace)/projects/constants/project-selection-page.ts` | exempt | exempt | wire/schema |
| `src/app/(workspace)/projects/page.tsx` | pending | clean | — |
| `src/app/api/admin/migrate/route.ts` | pending | clean | — |
| `src/app/api/ai/fal-segment/route.ts` | pending | clean | — |
| `src/app/api/ai/segment/route.ts` | pending | clean | — |
| `src/app/api/api-keys/route.ts` | pending | clean | — |
| `src/app/api/assets/[assetId]/route.ts` | pending | clean | — |
| `src/app/api/assets/upload/route.ts` | pending | clean | — |
| `src/app/api/auth/forgot-password/route.ts` | pending | clean | — |
| `src/app/api/auth/signin/route.ts` | pending | clean | — |
| `src/app/api/auth/signup/route.ts` | pending | clean | — |
| `src/app/api/complete-token/route.ts` | pending | clean | — |
| `src/app/api/debug/inspect/[id]/route.ts` | pending | clean | eslint 1 |
| `src/app/api/delete-image/route.ts` | pending | clean | — |
| `src/app/api/entities/[entityId]/route.ts` | pending | clean | — |
| `src/app/api/entities/mark-referenced/route.ts` | pending | clean | — |
| `src/app/api/entities/relationships/route.ts` | pending | clean | — |
| `src/app/api/entities/resolve/route.ts` | pending | clean | eslint 1 |
| `src/app/api/entities/route.ts` | pending | clean | — |
| `src/app/api/generate-3d/route.ts` | pending | clean | eslint 3 |
| `src/app/api/interior-designer/designs/route.ts` | pending | clean | eslint 2 |
| `src/app/api/interior-designer/material/[taskId]/route.ts` | pending | clean | — |
| `src/app/api/interior-designer/material/route.ts` | pending | clean | — |
| `src/app/api/interior-designer/retexture/[runId]/route.ts` | pending | clean | — |
| `src/app/api/interior-designer/retexture/route.ts` | pending | clean | — |
| `src/app/api/interior-designer/text-to-3d/[taskId]/route.ts` | pending | clean | — |
| `src/app/api/interior-designer/text-to-3d/route.ts` | pending | clean | — |
| `src/app/api/interior-designer/texture/route.ts` | pending | clean | — |
| `src/app/api/interior-designer/textures/route.ts` | pending | clean | — |
| `src/app/api/library/route.ts` | pending | clean | — |
| `src/app/api/llm-judge/route.ts` | pending | clean | — |
| `src/app/api/loop-creator/chat/route.ts` | pending | clean | — |
| `src/app/api/loop-creator/loops/route.ts` | pending | clean | eslint 2 |
| `src/app/api/loop-creator/market-analysis/[gameLoopId]/route.ts` | pending | clean | — |
| `src/app/api/loop-creator/market-analysis/route.ts` | pending | clean | — |
| `src/app/api/mcp/route.ts` | pending | clean | — |
| `src/app/api/projects/[projectId]/onboarding/route.ts` | pending | clean | eslint 4 |
| `src/app/api/proxy-model/route.ts` | pending | clean | — |
| `src/app/api/repaint/route.ts` | pending | clean | eslint 3 |
| `src/app/api/save-image/route.ts` | pending | clean | — |
| `src/app/api/save-model/route.ts` | pending | clean | — |
| `src/app/api/settings/models/route.ts` | pending | clean | — |
| `src/app/api/settings/providers/probe/route.ts` | pending | clean | — |
| `src/app/api/settings/providers/route.ts` | clean | clean | — |
| `src/app/api/storyteller/actions/route.ts` | pending | clean | eslint 1 |
| `src/app/api/storyteller/beats/[beatId]/generate-image/route.ts` | pending | clean | — |
| `src/app/api/storyteller/beats/[beatId]/route.ts` | pending | clean | — |
| `src/app/api/storyteller/beats/generate-prompt/route.ts` | pending | clean | — |
| `src/app/api/storyteller/beats/status/route.ts` | pending | clean | — |
| `src/app/api/storyteller/bible/lock/route.ts` | pending | clean | — |
| `src/app/api/storyteller/bible/route.ts` | pending | clean | — |
| `src/app/api/storyteller/characters/[characterId]/route.ts` | pending | clean | — |
| `src/app/api/storyteller/characters/route.ts` | pending | clean | eslint 1 |
| `src/app/api/storyteller/chat/answer/route.ts` | pending | clean | — |
| `src/app/api/storyteller/chat/route.ts` | pending | clean | — |
| `src/app/api/storyteller/chat/stream/route.ts` | pending | clean | — |
| `src/app/api/storyteller/chat/stream/stream-wire.ts` | exempt | exempt | wire/schema |
| `src/app/api/storyteller/consistency/apply/route.ts` | pending | clean | — |
| `src/app/api/storyteller/consistency/check/route.ts` | pending | clean | — |
| `src/app/api/storyteller/consistency/undo/route.ts` | pending | clean | — |
| `src/app/api/storyteller/episodes/[episodeId]/beats/route.ts` | pending | clean | — |
| `src/app/api/storyteller/episodes/[episodeId]/generate-combined/route.ts` | pending | clean | — |
| `src/app/api/storyteller/episodes/[episodeId]/generate-poster/route.ts` | pending | clean | — |
| `src/app/api/storyteller/episodes/[episodeId]/route.ts` | pending | clean | — |
| `src/app/api/storyteller/episodes/poster/status/route.ts` | pending | clean | — |
| `src/app/api/storyteller/episodes/route.ts` | pending | clean | — |
| `src/app/api/storyteller/generate-metrics/route.ts` | pending | clean | — |
| `src/app/api/storyteller/generate-portrait/route.ts` | pending | clean | — |
| `src/app/api/storyteller/generate-portrait/status/route.ts` | pending | clean | — |
| `src/app/api/storyteller/moodboard/status/route.ts` | pending | clean | — |
| `src/app/api/storyteller/moodboard/trigger/route.ts` | pending | clean | eslint 1 |
| `src/app/api/storyteller/plan/route.ts` | pending | clean | — |
| `src/app/api/storyteller/projects/[id]/route.ts` | pending | clean | — |
| `src/app/api/storyteller/projects/route.ts` | pending | clean | — |
| `src/app/api/storyteller/relationships/route.ts` | pending | clean | eslint 1 |
| `src/app/api/storyteller/save-episode-poster-variant/route.ts` | pending | clean | — |
| `src/app/api/storyteller/save-portrait-variant/route.ts` | pending | clean | — |
| `src/app/api/storyteller/script-review/route.ts` | pending | clean | — |
| `src/app/api/storyteller/script/edit/route.ts` | pending | clean | — |
| `src/app/api/storyteller/snapshots/route.ts` | pending | clean | — |
| `src/app/api/storyteller/timeline/route.ts` | pending | clean | — |
| `src/app/api/storyteller/workflow/resume/route.ts` | pending | clean | — |
| `src/app/api/storyteller/world-summary/route.ts` | pending | clean | eslint 1 |
| `src/app/api/tiles/accept-upscale/route.ts` | pending | clean | — |
| `src/app/api/tiles/upload/route.ts` | pending | clean | — |
| `src/app/api/trigger-3d/remesh/route.ts` | pending | clean | — |
| `src/app/api/trigger-3d/route.ts` | pending | clean | — |
| `src/app/api/trigger-3d/status/route.ts` | pending | clean | — |
| `src/app/api/trigger-fidelity/route.ts` | pending | clean | — |
| `src/app/api/trigger-fidelity/status/route.ts` | pending | clean | — |
| `src/app/api/trigger-tile/route.ts` | pending | clean | eslint 1 |
| `src/app/api/trigger-tile/status/route.ts` | pending | clean | — |
| `src/app/api/trigger-upload/route.ts` | pending | clean | — |
| `src/app/api/trigger-upscale/route.ts` | pending | clean | — |
| `src/app/api/trigger-upscale/select-variant/route.ts` | pending | clean | — |
| `src/app/api/trigger-upscale/status/route.ts` | pending | clean | — |
| `src/app/api/trigger/token/route.ts` | pending | clean | — |
| `src/app/api/upload-tile/route.ts` | pending | clean | — |
| `src/app/api/upscale/midjourney/route.ts` | pending | clean | eslint 1 |
| `src/app/api/users/onboarding/route.ts` | pending | clean | — |
| `src/app/api/waitlist/route.ts` | pending | clean | — |
| `src/app/api/workflows/game-design/route.ts` | pending | clean | — |
| `src/app/api/workflows/resume/route.ts` | pending | clean | — |
| `src/app/api/world/assets/route.ts` | pending | clean | — |
| `src/app/api/world/projects/route.ts` | pending | clean | — |
| `src/app/api/world/tiles/route.ts` | pending | clean | — |
| `src/app/error.tsx` | pending | clean | — |
| `src/app/global-error.tsx` | pending | clean | — |
| `src/app/layout.tsx` | pending | clean | — |
| `src/components/AlertDialog/AlertDialog.tsx` | pending | clean | — |
| `src/components/AlertDialog/index.ts` | pending | clean | — |
| `src/components/AsyncStatusIndicator/AsyncStatusIndicator.tsx` | pending | clean | eslint 1 |
| `src/components/AsyncStatusIndicator/constants/async-status-indicator.ts` | exempt | exempt | wire/schema |
| `src/components/AsyncStatusIndicator/index.ts` | pending | clean | — |
| `src/components/AuthProvider/AuthProvider.tsx` | pending | clean | — |
| `src/components/AuthProvider/index.ts` | pending | clean | — |
| `src/components/Avatar/Avatar.tsx` | pending | clean | — |
| `src/components/Avatar/index.ts` | pending | clean | — |
| `src/components/Badge/Badge.tsx` | clean | clean | — |
| `src/components/Badge/constants/badge-styles.ts` | exempt | exempt | wire/schema |
| `src/components/Badge/index.ts` | pending | clean | — |
| `src/components/BleedingText/BleedingText.tsx` | clean | clean | — |
| `src/components/BleedingText/constants/bleeding-text-defaults.ts` | exempt | exempt | wire/schema |
| `src/components/BleedingText/index.ts` | pending | clean | — |
| `src/components/Button/Button.tsx` | pending | clean | — |
| `src/components/Button/constants/button-styles.ts` | exempt | exempt | wire/schema |
| `src/components/Button/index.ts` | pending | clean | — |
| `src/components/Card/Card.tsx` | pending | clean | — |
| `src/components/Card/index.ts` | pending | clean | — |
| `src/components/ConfirmDialog/ConfirmDialog.tsx` | clean | clean | — |
| `src/components/ConfirmDialog/constants/confirm-dialog-copy.ts` | exempt | exempt | wire/schema |
| `src/components/ConfirmDialog/index.ts` | pending | clean | — |
| `src/components/Dialog/Dialog.tsx` | pending | clean | — |
| `src/components/Dialog/index.ts` | pending | clean | — |
| `src/components/DomainSidebar/DomainSidebar.tsx` | pending | clean | — |
| `src/components/DomainSidebar/constants/domain-sidebar.ts` | exempt | exempt | wire/schema |
| `src/components/DomainSidebar/index.ts` | pending | clean | — |
| `src/components/DropdownMenu/DropdownMenu.tsx` | pending | clean | — |
| `src/components/DropdownMenu/index.ts` | pending | clean | — |
| `src/components/EntityPicker/EntityPicker.tsx` | clean | clean | — |
| `src/components/EntityPicker/constants/entity-picker-copy.ts` | exempt | exempt | wire/schema |
| `src/components/EntityPicker/index.ts` | pending | clean | — |
| `src/components/ErrorBoundary/ErrorBoundary.tsx` | pending | clean | — |
| `src/components/ErrorBoundary/constants/error-boundary.ts` | exempt | exempt | wire/schema |
| `src/components/ErrorBoundary/index.ts` | pending | clean | — |
| `src/components/ErrorBoundaryWrapper/ErrorBoundaryWrapper.tsx` | pending | clean | — |
| `src/components/ErrorBoundaryWrapper/index.ts` | pending | clean | — |
| `src/components/GlowEffect/GlowEffect.tsx` | pending | clean | — |
| `src/components/GlowEffect/constants/glow-effect.ts` | exempt | exempt | wire/schema |
| `src/components/GlowEffect/index.ts` | pending | clean | — |
| `src/components/IconButton/IconButton.tsx` | clean | clean | — |
| `src/components/IconButton/constants/icon-button-styles.ts` | exempt | exempt | wire/schema |
| `src/components/IconButton/index.ts` | pending | clean | — |
| `src/components/ImageLightbox/ImageLightbox.tsx` | clean | clean | — |
| `src/components/ImageLightbox/constants/image-lightbox-keys.ts` | exempt | exempt | wire/schema |
| `src/components/ImageLightbox/index.ts` | pending | clean | — |
| `src/components/Input/Input.tsx` | pending | clean | — |
| `src/components/Input/index.ts` | pending | clean | — |
| `src/components/Label/Label.tsx` | clean | clean | — |
| `src/components/Label/constants/label-styles.ts` | exempt | exempt | wire/schema |
| `src/components/Label/index.ts` | pending | clean | — |
| `src/components/LiquidGlass/LiquidGlass.tsx` | pending | clean | — |
| `src/components/LiquidGlass/index.ts` | pending | clean | — |
| `src/components/LoginButton/LoginButton.tsx` | pending | clean | — |
| `src/components/LoginButton/constants/login-button.ts` | exempt | exempt | wire/schema |
| `src/components/LoginButton/index.ts` | pending | clean | — |
| `src/components/Progress/Progress.tsx` | pending | clean | — |
| `src/components/Progress/index.ts` | pending | clean | — |
| `src/components/ScrollArea/ScrollArea.tsx` | pending | clean | — |
| `src/components/ScrollArea/constants/scroll-orientation.ts` | exempt | exempt | wire/schema |
| `src/components/ScrollArea/index.ts` | pending | clean | — |
| `src/components/Skeleton/Skeleton.tsx` | pending | clean | — |
| `src/components/Skeleton/index.ts` | pending | clean | — |
| `src/components/Slider/Slider.tsx` | pending | clean | — |
| `src/components/Slider/index.ts` | pending | clean | — |
| `src/components/Switch/Switch.tsx` | pending | clean | — |
| `src/components/Switch/index.ts` | pending | clean | — |
| `src/components/Tabs/Tabs.tsx` | pending | clean | — |
| `src/components/Tabs/index.ts` | pending | clean | — |
| `src/components/TextEffects/TextEffects.tsx` | pending | clean | — |
| `src/components/TextEffects/constants/text-effects.ts` | exempt | exempt | wire/schema |
| `src/components/TextEffects/index.ts` | pending | clean | — |
| `src/components/Textarea/Textarea.tsx` | pending | clean | — |
| `src/components/Textarea/index.ts` | pending | clean | — |
| `src/components/Tooltip/Tooltip.tsx` | pending | clean | — |
| `src/components/Tooltip/index.ts` | pending | clean | — |
| `src/components/shell/GameHubDashboard/GameHubDashboard.tsx` | pending | clean | — |
| `src/components/shell/GameHubDashboard/constants/game-hub-dashboard.ts` | exempt | exempt | wire/schema |
| `src/components/shell/GameHubDashboard/index.ts` | pending | clean | — |
| `src/components/shell/GlobalHeader/GlobalHeader.tsx` | pending | clean | — |
| `src/components/shell/GlobalHeader/index.ts` | pending | clean | — |
| `src/components/shell/GlobalSidebar/GlobalSidebar.tsx` | pending | clean | — |
| `src/components/shell/GlobalSidebar/index.ts` | pending | clean | — |
| `src/components/shell/ModuleOnboardingController/ModuleOnboardingController.tsx` | pending | clean | eslint 2 |
| `src/components/shell/ModuleOnboardingController/constants/module-onboarding.ts` | exempt | exempt | wire/schema |
| `src/components/shell/ModuleOnboardingController/index.ts` | pending | clean | — |
| `src/components/shell/ProjectLoader/ProjectLoader.tsx` | pending | clean | — |
| `src/components/shell/ProjectLoader/index.ts` | pending | clean | — |
| `src/components/shell/ProjectSelectorDropdown/ProjectSelectorDropdown.tsx` | pending | clean | eslint 1 |
| `src/components/shell/ProjectSelectorDropdown/constants/project-selector-dropdown.ts` | exempt | exempt | wire/schema |
| `src/components/shell/ProjectSelectorDropdown/index.ts` | pending | clean | — |
| `src/components/shell/ProjectTourWrapper/ProjectTourWrapper.tsx` | pending | clean | — |
| `src/components/shell/ProjectTourWrapper/index.ts` | pending | clean | — |
| `src/components/shell/Tour/Tour.tsx` | pending | clean | eslint 2 |
| `src/components/shell/Tour/index.ts` | pending | clean | — |
| `src/components/shell/TroubleshootIndicator/TroubleshootIndicator.tsx` | pending | clean | — |
| `src/components/shell/TroubleshootIndicator/index.ts` | pending | clean | — |
| `src/components/shell/TroubleshootPanel/TroubleshootPanel.tsx` | clean | clean | — |
| `src/components/shell/TroubleshootPanel/constants/troubleshoot-panel.ts` | exempt | exempt | wire/schema |
| `src/components/shell/TroubleshootPanel/index.ts` | pending | clean | — |
| `src/db/client.ts` | pending | clean | eslint 1 |
| `src/db/index.ts` | pending | clean | — |
| `src/db/schema.ts` | exempt | exempt | wire/schema |
| `src/domains/3d-asset-exporter/constants/asset-exporter-keys.ts` | exempt | exempt | wire/schema |
| `src/domains/3d-asset-exporter/constants/asset-upload.ts` | exempt | exempt | wire/schema |
| `src/domains/3d-asset-exporter/constants/three-d-viewer-messages.ts` | exempt | exempt | wire/schema |
| `src/domains/3d-asset-exporter/index.ts` | pending | clean | — |
| `src/domains/3d-asset-exporter/core/io/asset-exporter.api.ts` | pending | clean | — |
| `src/domains/3d-asset-exporter/core/io/asset-exporter.dto.ts` | pending | clean | — |
| `src/domains/3d-asset-exporter/core/io/asset-exporter.keys.ts` | clean | clean | — |
| `src/domains/3d-asset-exporter/state/index.ts` | pending | clean | — |
| `src/domains/3d-asset-exporter/state/queries/index.ts` | pending | clean | — |
| `src/domains/3d-asset-exporter/tasks/generate-3d-model.task.ts` | exempt | exempt | wire/schema |
| `src/domains/3d-asset-exporter/tasks/remesh-3d-model.task.ts` | exempt | exempt | wire/schema |
| `src/domains/3d-asset-exporter/tasks/retexture-model.task.ts` | exempt | exempt | wire/schema |
| `src/domains/3d-asset-exporter/tasks/surface-material.task.ts` | exempt | exempt | wire/schema |
| `src/domains/3d-asset-exporter/tasks/text-to-3d.task.ts` | exempt | exempt | wire/schema |
| `src/domains/3d-asset-exporter/ui/AssetEditor.tsx` | pending | clean | — |
| `src/domains/3d-asset-exporter/ui/AssetExporterSidebar.tsx` | pending | clean | eslint 3 |
| `src/domains/3d-asset-exporter/ui/AssetUploadZone.tsx` | pending | clean | eslint 1 |
| `src/domains/3d-asset-exporter/ui/ThreeDPanel.tsx` | pending | clean | — |
| `src/domains/3d-asset-exporter/ui/ThreeDViewer.tsx` | clean | clean | eslint 9 |
| `src/domains/__tests__/domain-conformance.ts` | pending | clean | — |
| `src/domains/__tests__/domain-structure.test.ts` | pending | clean | — |
| `src/domains/game-design/ai/GameDesignAgent.ts` | exempt | exempt | wire/schema |
| `src/domains/game-design/ai/constants/memory.ts` | exempt | exempt | wire/schema |
| `src/domains/game-design/ai/game-loop-workflow.ts` | exempt | exempt | wire/schema |
| `src/domains/game-design/ai/agents/memory.ts` | exempt | exempt | wire/schema |
| `src/domains/game-design/ai/agents/pattern-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/game-design/ai/tools/v2/haute-game-tools.ts` | exempt | exempt | wire/schema; eslint 1 |
| `src/domains/game-design/ai/tools/v2/logic-transformers.ts` | exempt | exempt | wire/schema; eslint 9 |
| `src/domains/game-design/ai/tools/v2/loop-tools.ts` | exempt | exempt | wire/schema |
| `src/domains/game-design/core/schemas.ts` | exempt | exempt | wire/schema |
| `src/domains/game-design/index.ts` | pending | clean | — |
| `src/domains/interior-designer/constants/asset-library.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/camera-controller.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/design-manager-copy.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/export.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/floor-manager.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/ground-surfaces.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/interaction-modes.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/interior-api-defaults.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/interior-designer-messages.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/interior-storage.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/keyboard.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/mesh-colors.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/object-manager-messages.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/properties-panel.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/retexture-exporter-log.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/retexture-slice-log.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/scene-slice-log.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/surface-material-generation.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/surface-render-config.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/surface-tool-config.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/terrain-defaults.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/terrain-editor-panel.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/terrain-slice-log.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/texture-defaults.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/texture-service.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/three-js.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/unity-export.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/unity-yaml.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/constants/wall-tool-messages.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/core/UnityExporter.ts` | pending | clean | eslint 2 |
| `src/domains/interior-designer/core/UnityYAML.ts` | clean | clean | — |
| `src/domains/interior-designer/core/index.ts` | pending | clean | — |
| `src/domains/interior-designer/core/interior-types.ts` | pending | clean | — |
| `src/domains/interior-designer/core/polygonUtils.ts` | pending | clean | eslint 3 |
| `src/domains/interior-designer/core/scene-element-guards.ts` | pending | clean | — |
| `src/domains/interior-designer/core/textureCache.ts` | pending | clean | eslint 1 |
| `src/domains/interior-designer/core/vec3.ts` | pending | clean | — |
| `src/domains/interior-designer/index.ts` | pending | clean | — |
| `src/domains/interior-designer/interior-designer.config.ts` | pending | clean | — |
| `src/domains/interior-designer/core/io/constants/query-keys.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/core/io/index.ts` | pending | clean | — |
| `src/domains/interior-designer/core/io/interior-designer.api.ts` | pending | clean | — |
| `src/domains/interior-designer/core/io/interior-designer.dto.ts` | clean | clean | — |
| `src/domains/interior-designer/core/io/interior-designer.keys.ts` | pending | clean | — |
| `src/domains/interior-designer/prompts/index.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/services/TextureService.ts` | pending | clean | — |
| `src/domains/interior-designer/services/index.ts` | pending | clean | — |
| `src/domains/interior-designer/state/index.ts` | pending | clean | — |
| `src/domains/interior-designer/state/interior-state.ts` | pending | clean | — |
| `src/domains/interior-designer/state/interior-store-constants.ts` | pending | clean | — |
| `src/domains/interior-designer/state/queries/index.ts` | pending | clean | — |
| `src/domains/interior-designer/state/slices/persistence-slice.ts` | pending | clean | — |
| `src/domains/interior-designer/state/slices/retexture-slice.ts` | pending | clean | — |
| `src/domains/interior-designer/state/slices/scene-slice.ts` | pending | clean | — |
| `src/domains/interior-designer/state/slices/terrain-slice.ts` | pending | clean | — |
| `src/domains/interior-designer/state/slices/ui-slice.ts` | pending | clean | — |
| `src/domains/interior-designer/state/useInteriorStore.ts` | clean | clean | — |
| `src/domains/interior-designer/tasks/index.ts` | pending | clean | — |
| `src/domains/interior-designer/ui/CameraController.tsx` | clean | clean | eslint 1 |
| `src/domains/interior-designer/ui/DesignManager.tsx` | pending | clean | eslint 1 |
| `src/domains/interior-designer/ui/Exporter.tsx` | clean | clean | — |
| `src/domains/interior-designer/ui/FloorManager.tsx` | pending | clean | — |
| `src/domains/interior-designer/ui/InteriorCanvas.tsx` | pending | clean | — |
| `src/domains/interior-designer/ui/InteriorDesignerWorkspace/InteriorDesignerWorkspace.tsx` | clean | clean | eslint 1 |
| `src/domains/interior-designer/ui/InteriorDesignerWorkspace/index.ts` | pending | clean | — |
| `src/domains/interior-designer/ui/KeybindingManager.tsx` | pending | clean | — |
| `src/domains/interior-designer/ui/ObjectManager.tsx` | clean | clean | — |
| `src/domains/interior-designer/ui/RetextureExporter.tsx` | pending | clean | — |
| `src/domains/interior-designer/ui/SculptableSurface.tsx` | pending | clean | eslint 3 |
| `src/domains/interior-designer/ui/SurfaceManager.tsx` | pending | clean | eslint 1 |
| `src/domains/interior-designer/ui/TransformManager.tsx` | pending | clean | — |
| `src/domains/interior-designer/ui/UI/AssetLibrary.tsx` | pending | clean | eslint 3 |
| `src/domains/interior-designer/ui/UI/InteriorRightSidebar.tsx` | pending | clean | — |
| `src/domains/interior-designer/ui/UI/LayerPanel.tsx` | pending | clean | — |
| `src/domains/interior-designer/ui/UI/PropertiesPanel.tsx` | pending | clean | eslint 8 |
| `src/domains/interior-designer/ui/UI/SurfaceProperties.tsx` | pending | clean | eslint 2 |
| `src/domains/interior-designer/ui/UI/TerrainEditorPanel.tsx` | pending | clean | — |
| `src/domains/interior-designer/ui/UI/Toolbar.tsx` | pending | clean | — |
| `src/domains/interior-designer/ui/UI/constants/surface-properties-presets.ts` | exempt | exempt | wire/schema |
| `src/domains/interior-designer/ui/VoxelTerrainMesh.tsx` | pending | clean | — |
| `src/domains/interior-designer/ui/WallManager.tsx` | clean | clean | — |
| `src/domains/interior-designer/ui/index.ts` | pending | clean | — |
| `src/domains/interior-designer/ui/meshes/DoorMesh.tsx` | 44 err | clean | — |
| `src/domains/interior-designer/ui/meshes/RoadMesh.tsx` | clean | clean | eslint 1 |
| `src/domains/interior-designer/ui/meshes/WindowMesh.tsx` | clean | clean | — |
| `src/domains/interior-designer/ui/terrain/GlobalWaterPlane.tsx` | clean | clean | — |
| `src/domains/interior-designer/ui/terrain/TerrainBrushPreview.tsx` | pending | clean | — |
| `src/domains/interior-designer/ui/terrain/index.ts` | pending | clean | — |
| `src/domains/interior-designer/ui/tools/ObjectTool.tsx` | pending | clean | — |
| `src/domains/interior-designer/ui/tools/ScatterTool.tsx` | clean | clean | — |
| `src/domains/interior-designer/ui/tools/SurfaceTool.tsx` | pending | clean | — |
| `src/domains/interior-designer/ui/tools/TerrainTool.tsx` | clean | clean | eslint 1 |
| `src/domains/interior-designer/ui/tools/WallTool.tsx` | pending | clean | — |
| `src/domains/loop-creator/ai/agents/balance-analyst.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/concept-evaluator.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/loop-planner.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst-wrapper.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/index.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/market-analysis-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/prompts.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools-registry.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/audience-analyzer.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/competitor-finder.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/game-database.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/market-momentum.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/market-size.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/mechanics-loops-schema.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/metrics-planner.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/pattern-matcher.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/reddit-pulse.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/report-generator.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/scorers/best-match.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/scorers/counter-strike.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/scorers/disco-elysium.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/scorers/vampire-survivors.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/steam-charts.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/steam-trending.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/structured-tool.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/trend-analyzer.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/twitter-trends.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/tools/web-search.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/market-analyst/types.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/mechanics-designer.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/progression-architect.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/ai/agents/supervisor.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/constants/abort-error.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/constants/agent-nodes.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/constants/auto-save.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/constants/custom-nodes.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/constants/graph-state-defaults.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/constants/layout-messages.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/constants/loop-agent-actions.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/constants/loop-http.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/constants/loop-node-defaults.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/constants/loop-orchestrator.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/constants/loop-selector.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/constants/market-analysis.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/constants/properties-panel.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/constants/timescale-order.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/core/graph/agent-nodes.ts` | pending | clean | — |
| `src/domains/loop-creator/core/graph/loop-graph.ts` | pending | clean | — |
| `src/domains/loop-creator/core/graph/loop-orchestrator.ts` | pending | clean | — |
| `src/domains/loop-creator/core/graph/state.ts` | clean | clean | eslint 5 |
| `src/domains/loop-creator/core/layout.ts` | pending | clean | — |
| `src/domains/loop-creator/core/loop-agent-action-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/core/loop-node-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/core/mentions/constants/mention-catalog.ts` | exempt | exempt | wire/schema |
| `src/domains/loop-creator/core/mentions/mention-entity-items.ts` | pending | clean | — |
| `src/domains/loop-creator/core/mentions/mention-section-items.ts` | pending | clean | — |
| `src/domains/loop-creator/core/mentions/providers.ts` | pending | clean | — |
| `src/domains/loop-creator/index.ts` | pending | clean | — |
| `src/domains/loop-creator/server.ts` | pending | clean | — |
| `src/domains/loop-creator/state/useAutoSave.ts` | pending | clean | — |
| `src/domains/loop-creator/ui/CustomNodes.tsx` | pending | clean | — |
| `src/domains/loop-creator/ui/LoopCreatorLayout.tsx` | pending | clean | eslint 12 |
| `src/domains/loop-creator/ui/LoopEmptyState.tsx` | pending | clean | — |
| `src/domains/loop-creator/ui/LoopSelector.tsx` | pending | clean | — |
| `src/domains/loop-creator/ui/MarketAnalysisPanel.tsx` | pending | clean | eslint 1 |
| `src/domains/loop-creator/ui/PropertiesPanel.tsx` | pending | clean | — |
| `src/domains/loop-creator/ui/SuggestionPanel.tsx` | pending | clean | eslint 1 |
| `src/domains/loop-creator/ui/constants/loop-creator-layout.ts` | exempt | exempt | wire/schema |
| `src/domains/marketing/constants/legal-docs.ts` | exempt | exempt | wire/schema |
| `src/domains/marketing/constants/liquid.ts` | exempt | exempt | wire/schema |
| `src/domains/marketing/constants/three-d-icon.ts` | exempt | exempt | wire/schema |
| `src/domains/marketing/core/legal-docs.ts` | clean | clean | — |
| `src/domains/marketing/index.ts` | pending | clean | — |
| `src/domains/marketing/state/LiquidContext.tsx` | clean | clean | — |
| `src/domains/marketing/ui/GlobalLiquidLoader.tsx` | clean | clean | eslint 2 |
| `src/domains/marketing/ui/LandingPage/LandingPage.tsx` | pending | clean | — |
| `src/domains/marketing/ui/LandingPage/components/ApiMcpSection.tsx` | pending | clean | — |
| `src/domains/marketing/ui/LandingPage/components/ArchitectingRealitySection.tsx` | pending | clean | — |
| `src/domains/marketing/ui/LandingPage/components/BentoGrid.tsx` | pending | clean | — |
| `src/domains/marketing/ui/LandingPage/components/ClientOnly.tsx` | pending | clean | — |
| `src/domains/marketing/ui/LandingPage/components/FeatureDeepDive.tsx` | pending | clean | — |
| `src/domains/marketing/ui/LandingPage/components/FeatureLightbox.tsx` | pending | clean | — |
| `src/domains/marketing/ui/LandingPage/components/HeadlineVariant.tsx` | pending | clean | — |
| `src/domains/marketing/ui/LandingPage/components/LandingFooter.tsx` | pending | clean | — |
| `src/domains/marketing/ui/LandingPage/components/LandingHero.tsx` | pending | clean | — |
| `src/domains/marketing/ui/LandingPage/components/LandingNav.tsx` | pending | clean | — |
| `src/domains/marketing/ui/LandingPage/components/ManifestoSection.tsx` | pending | clean | — |
| `src/domains/marketing/ui/LandingPage/components/SystemsSection.tsx` | pending | clean | — |
| `src/domains/marketing/ui/LandingPage/components/_legacy/BrutalCard.tsx` | pending | clean | — |
| `src/domains/marketing/ui/LandingPage/components/_legacy/TerminalInput.tsx` | pending | clean | — |
| `src/domains/marketing/ui/LandingPage/constants/landing-copy.ts` | exempt | exempt | wire/schema |
| `src/domains/marketing/ui/LandingPage/constants/landing-deep-dives.ts` | exempt | exempt | wire/schema |
| `src/domains/marketing/ui/LandingPage/constants/landing-features-legacy.ts` | exempt | exempt | wire/schema |
| `src/domains/marketing/ui/LandingPage/constants/landing-nav.ts` | exempt | exempt | wire/schema |
| `src/domains/marketing/ui/LandingPage/constants/landing-scroll.ts` | exempt | exempt | wire/schema |
| `src/domains/marketing/ui/LandingPage/constants/landing-ui-copy.ts` | exempt | exempt | wire/schema |
| `src/domains/marketing/ui/LandingPage/hooks/useLandingScroll.ts` | pending | clean | — |
| `src/domains/marketing/ui/LandingPage/index.ts` | pending | clean | — |
| `src/domains/marketing/ui/LandingPage/types.ts` | pending | clean | — |
| `src/domains/marketing/ui/LegalMarkdownPage.tsx` | pending | clean | — |
| `src/domains/marketing/ui/Liquid.tsx` | clean | clean | eslint 3 |
| `src/domains/marketing/ui/LiquidBackgroundProvider.tsx` | clean | clean | — |
| `src/domains/marketing/ui/ProPlanPromo.tsx` | pending | clean | — |
| `src/domains/marketing/ui/ThreeDIcon.tsx` | pending | clean | eslint 7 |
| `src/domains/marketing/ui/ToolsIntegration.tsx` | pending | clean | — |
| `src/domains/marketing/ui/TurbulentBackground.tsx` | clean | clean | — |
| `src/domains/storyteller/ai/agents/BeatPlanner/BeatPlannerAgent.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/BeatPlanner/__tests__/beat-plan-quality.test.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/BeatPlanner/beat-plan-concreteness-scorer.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/BeatPlanner/beat-plan-quality.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/BeatPlanner/beat-plan-schema.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/BeatPlanner/constants/beat-plan-quality.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/GrrmAuthor/GrrmAuthorAgent.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/Muse/MuseAgent.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/Muse/__tests__/brainstorm.test.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/Muse/brainstorm.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/Muse/rank.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/Muse/ranked-idea-schema.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/Muse/wild-idea-schema.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/StorytellerAgent/StorytellerAgent.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/StorytellerAgent/index.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/constants/agent-identity.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/constants/tracing.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/constants/workflow-tool.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/critics/ContinuityCritic.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/critics/ProseCritic.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/critics/StakesCritic.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/critics/constants/critic-agents.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/critics/critic-discipline-scorer.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/critics/critic-rules.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/critics/critic-schema.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/critics/index.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/agents/critics/run-critic.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/index.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/request-context.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/tools/beat-tools.ts` | exempt | exempt | wire/schema; eslint 2 |
| `src/domains/storyteller/ai/tools/bible-tools.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/tools/character-tools.ts` | exempt | exempt | wire/schema; eslint 2 |
| `src/domains/storyteller/ai/tools/episode-tools.ts` | exempt | exempt | wire/schema; eslint 2 |
| `src/domains/storyteller/ai/tools/index.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/tools/workflow-tool.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/tracing.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/workflows/__tests__/beat-draft-workflow.e2e.test.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/workflows/__tests__/beat-draft-workflow.test.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/workflows/beat-draft-contract.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/workflows/beat-draft-workflow.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/workflows/constants/beat-draft-workflow.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ai/workflows/stateless-agents.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/config/__tests__/tool-result-mapper.test.ts` | pending | clean | — |
| `src/domains/storyteller/config/action-config.ts` | pending | clean | — |
| `src/domains/storyteller/config/constants/ChatModelCatalog.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/config/constants/ModelConfig.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/config/constants/bible-wire-fields.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/config/constants/storyteller-agents.tsx` | exempt | exempt | wire/schema |
| `src/domains/storyteller/config/constants/storyteller-config-defaults.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/config/constants/tool-result-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/config/storyteller-config.ts` | pending | clean | — |
| `src/domains/storyteller/config/tool-result-mapper.ts` | pending | clean | eslint 1 |
| `src/domains/storyteller/core/constants/cascade-editor.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/editing/CascadeEditor.ts` | pending | clean | eslint 9 |
| `src/domains/storyteller/core/editing/DeepMerge.ts` | pending | clean | — |
| `src/domains/storyteller/core/editing/UndoManager.ts` | pending | clean | — |
| `src/domains/storyteller/core/editing/constants/undo-manager.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/editing/index.ts` | pending | clean | eslint 3 |
| `src/domains/storyteller/core/entities/EntityExtractor.ts` | pending | clean | — |
| `src/domains/storyteller/core/entities/EntityReferences.ts` | pending | clean | — |
| `src/domains/storyteller/core/entities/ReferenceParser.ts` | pending | clean | — |
| `src/domains/storyteller/core/entities/character-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/entities/constants/entity-extractor-defaults.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/entities/constants/entity-types.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/entities/constants/reference-parser.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/entities/entity-type-guards.ts` | pending | clean | — |
| `src/domains/storyteller/core/entities/index.ts` | pending | clean | — |
| `src/domains/storyteller/core/entities/story-plan-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/entities/world-rule-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/formatting/ActionFormatters.ts` | pending | clean | — |
| `src/domains/storyteller/core/formatting/StoryPlanFields.ts` | pending | clean | — |
| `src/domains/storyteller/core/formatting/constants/action-display.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/formatting/constants/story-plan-fields.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/formatting/index.ts` | pending | clean | eslint 2 |
| `src/domains/storyteller/core/index.ts` | pending | clean | eslint 5 |
| `src/domains/storyteller/core/muse/__tests__/entropy.test.ts` | pending | clean | — |
| `src/domains/storyteller/core/muse/constants/action-heuristics.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/muse/constants/craft-contrast.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/muse/constants/entropy-cards.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/muse/entropy.ts` | pending | clean | — |
| `src/domains/storyteller/core/storyteller-page-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/types/ActionTypes.ts` | pending | clean | — |
| `src/domains/storyteller/core/types/ConsistencyTypes.ts` | pending | clean | eslint 7 |
| `src/domains/storyteller/core/types/Enums.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/types/StoryPlanTypes.ts` | pending | clean | — |
| `src/domains/storyteller/core/types/StoryTypes.ts` | pending | clean | eslint 5 |
| `src/domains/storyteller/core/types/index.ts` | pending | clean | eslint 5 |
| `src/domains/storyteller/core/utils/index.ts` | pending | clean | eslint 1 |
| `src/domains/storyteller/core/utils/youtube-utils.ts` | pending | clean | — |
| `src/domains/storyteller/index.ts` | pending | clean | — |
| `src/domains/storyteller/core/io/constants/bible-lock.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/io/constants/chat-route.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/io/constants/query-keys.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/io/constants/relationships-api.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/core/io/mastra-runtime.ts` | pending | clean | — |
| `src/domains/storyteller/core/io/storyteller.api.ts` | pending | clean | — |
| `src/domains/storyteller/core/io/storyteller.dto.ts` | pending | clean | — |
| `src/domains/storyteller/core/io/storyteller.keys.ts` | pending | clean | — |
| `src/domains/storyteller/prompts/GrrmSystemPrompt.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/prompts/beat-planner-prompt.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/prompts/chat-adapter-prompt.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/prompts/guardrails/anti-slop-phrases.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/prompts/schemas/agent-schemas.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/prompts/types.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/server.ts` | pending | clean | — |
| `src/domains/storyteller/services/AccessVerificationService.ts` | pending | clean | — |
| `src/domains/storyteller/services/BeatImageService.ts` | pending | clean | — |
| `src/domains/storyteller/services/ConsistencyCheckAdapter.ts` | pending | clean | — |
| `src/domains/storyteller/services/ConsistencyService.ts` | pending | clean | eslint 1 |
| `src/domains/storyteller/services/ContextAssemblyService.ts` | pending | clean | eslint 1 |
| `src/domains/storyteller/services/ContextualSummaryService.ts` | pending | clean | — |
| `src/domains/storyteller/services/EntityAutoLinkerService.ts` | pending | clean | eslint 2 |
| `src/domains/storyteller/services/EntityGraphService.ts` | pending | clean | eslint 4 |
| `src/domains/storyteller/services/EntityLoaderService.ts` | pending | clean | eslint 1 |
| `src/domains/storyteller/services/EntityRegistryService.ts` | pending | clean | eslint 4 |
| `src/domains/storyteller/services/MoodboardGenerationService.ts` | pending | clean | eslint 2 |
| `src/domains/storyteller/services/PosterGenerationService.ts` | pending | clean | eslint 4 |
| `src/domains/storyteller/services/RagService.ts` | pending | clean | — |
| `src/domains/storyteller/services/ReferenceValidatorService.ts` | pending | clean | eslint 1 |
| `src/domains/storyteller/services/RelationshipEnricherService.ts` | pending | clean | — |
| `src/domains/storyteller/services/ScriptOperationsService.ts` | pending | clean | — |
| `src/domains/storyteller/services/ScriptReviewService.ts` | pending | clean | — |
| `src/domains/storyteller/services/StorytellerCrudService.ts` | pending | clean | — |
| `src/domains/storyteller/services/consistency-types.ts` | pending | clean | — |
| `src/domains/storyteller/services/constants/access-verification.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/constants/beat-image-service.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/constants/consistency-check-adapter.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/constants/consistency-issues.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/constants/context-assembly.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/constants/contextual-summary.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/constants/entity-auto-linker.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/constants/entity-graph-log.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/constants/entity-graph-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/constants/entity-loader.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/constants/entity-registry-log.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/constants/moodboard-generation-service.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/constants/poster-generation-service.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/constants/rag-document-type.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/constants/relationship-enricher.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/constants/script-operations.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/constants/script-review.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/constants/series-bible-prompt.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/constants/storyteller-crud-service.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/constants/token-budget.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/services/context/SeriesBible.ts` | pending | clean | eslint 3 |
| `src/domains/storyteller/services/context/series-bible-from-record.ts` | pending | clean | — |
| `src/domains/storyteller/services/context/token-budget.ts` | pending | clean | — |
| `src/domains/storyteller/state/constants/agent-trigger-prompts.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/state/constants/bible-state.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/state/constants/hydration.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/state/constants/loading-operation-status.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/state/constants/merge-episode-plan.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/state/constants/storyteller-actions.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/state/constants/storyteller-chat.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/state/constants/storyteller-ui-store.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/state/hooks/useLoadingStates.ts` | pending | clean | — |
| `src/domains/storyteller/state/hooks/useStorytellerAgents.tsx` | pending | clean | eslint 2 |
| `src/domains/storyteller/state/hooks/useStorytellerChat.ts` | pending | clean | eslint 7 |
| `src/domains/storyteller/state/hooks/useStorytellerEpisodeData.ts` | pending | clean | — |
| `src/domains/storyteller/state/hooks/useStorytellerGeneration.ts` | pending | clean | eslint 2 |
| `src/domains/storyteller/state/hooks/useStorytellerHydration.ts` | pending | clean | — |
| `src/domains/storyteller/state/hooks/useStorytellerPage.ts` | pending | clean | — |
| `src/domains/storyteller/state/hooks/useStorytellerPageBase.ts` | pending | clean | — |
| `src/domains/storyteller/state/hooks/useStorytellerPhase.ts` | pending | clean | — |
| `src/domains/storyteller/state/queries/useBibleLock.ts` | pending | clean | eslint 1 |
| `src/domains/storyteller/state/queries/useBibleState.ts` | pending | clean | — |
| `src/domains/storyteller/state/queries/useEntity.ts` | pending | clean | — |
| `src/domains/storyteller/state/queries/useEpisodeData.ts` | pending | clean | — |
| `src/domains/storyteller/state/queries/useEpisodes.ts` | pending | clean | eslint 2 |
| `src/domains/storyteller/state/queries/useStorytellerActions.ts` | pending | clean | eslint 1 |
| `src/domains/storyteller/state/storyteller-chat-seam.ts` | pending | clean | — |
| `src/domains/storyteller/state/storyteller-world-seam.ts` | pending | clean | eslint 1 |
| `src/domains/storyteller/state/useStorytellerUiStore.ts` | pending | clean | — |
| `src/domains/storyteller/state/utils/beat-card-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/state/utils/episode-route.ts` | pending | clean | — |
| `src/domains/storyteller/state/utils/merge-episode-plan.ts` | pending | clean | — |
| `src/domains/storyteller/storyteller.config.ts` | pending | clean | eslint 1 |
| `src/domains/storyteller/tasks/generate-combined-storyboard.task.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/tasks/generate-episode-poster.task.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/tasks/generate-moodboard.task.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/tasks/generate-portrait.task.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/tasks/generate-poster.task.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/tasks/generate-storyboard.task.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/tasks/select-portrait-variant.task.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/tasks/upload-asset.task.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/ActionApprovalModal/ActionApprovalModal.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/ActionApprovalModal/ApprovalModalDiffPanel.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/ActionApprovalModal/ApprovalModalSummaryPanel.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/ActionApprovalModal/GenericItemTable.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/ActionApprovalModal/action-approval-helpers.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/ActionApprovalModal/action-approval-types.ts` | pending | clean | — |
| `src/domains/storyteller/ui/ActionApprovalModal/constants/action-approval-display.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/ActionApprovalModal/extract-action-changes.ts` | pending | clean | — |
| `src/domains/storyteller/ui/ActionApprovalModal/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/ActionApprovalModal/useApprovalModalKeyboard.ts` | pending | clean | — |
| `src/domains/storyteller/ui/ActionToast/ActionToast.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/ActionToast/constants/action-toast-display.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/ActionToast/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/AgentLog/AgentLog.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/AgentLog/constants/agent-log-config.tsx` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/AgentLog/constants/agent-log.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/AgentLog/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/BeatCard/BeatCard.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/BeatCard/constants/beat-card.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/BeatCard/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/CharacterCreationDialog/CharacterCreationDialog.tsx` | pending | clean | eslint 5 |
| `src/domains/storyteller/ui/CharacterCreationDialog/constants/character-creation-dialog.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/CharacterCreationDialog/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/CharacterPanel/CharacterPanel.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/CharacterPanel/constants/character-panel-metrics.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/CharacterPanel/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/CharacterWeb/CharacterNode.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/CharacterWeb/CharacterNodeMetrics.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/CharacterWeb/CharacterWeb.tsx` | pending | clean | eslint 6 |
| `src/domains/storyteller/ui/CharacterWeb/constants/character-node.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/CharacterWeb/constants/character-web.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/CharacterWeb/constants/relationship-web-styles.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/CharacterWeb/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/CharacterWeb/types.ts` | pending | clean | — |
| `src/domains/storyteller/ui/ConsistencyMessage/ConsistencyMessage.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/ConsistencyMessage/constants/consistency-message-display.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/ConsistencyMessage/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/CorkBoard/CorkBoard.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/CorkBoard/constants/cork-board.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/CorkBoard/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/EpisodeManager/EpisodeManager.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/EpisodeManager/constants/episode-manager.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/EpisodeManager/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/EpisodePremisePanel/EpisodePremisePanel.tsx` | pending | clean | eslint 1 |
| `src/domains/storyteller/ui/EpisodePremisePanel/constants/episode-premise-panel.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/EpisodePremisePanel/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/EpisodeRoadmapCard/EpisodeRoadmapCard.tsx` | pending | clean | eslint 1 |
| `src/domains/storyteller/ui/EpisodeRoadmapCard/constants/episode-roadmap-card.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/EpisodeRoadmapCard/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/FactionCard/FactionCard.tsx` | clean | clean | — |
| `src/domains/storyteller/ui/FactionCard/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/ImageVariantSelector/ImageVariantSelector.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/ImageVariantSelector/constants/image-variant-selector.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/ImageVariantSelector/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/JSONDiffViewer/JSONDiffViewer.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/JSONDiffViewer/constants/json-diff-viewer.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/JSONDiffViewer/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/MasterPromptEditor/MasterPromptEditor.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/MasterPromptEditor/constants/master-prompt-editor.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/MasterPromptEditor/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/MentionsProvider/MentionsProvider.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/MentionsProvider/constants/mention-catalog.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/MentionsProvider/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/MentionsProvider/mention-entity-items.ts` | pending | clean | — |
| `src/domains/storyteller/ui/MentionsProvider/mention-section-items.ts` | pending | clean | — |
| `src/domains/storyteller/ui/MentionsProvider/providers.ts` | pending | clean | — |
| `src/domains/storyteller/ui/MentionsProvider/storyteller-chat-renderers.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/PhaseNavigator/PhaseNavigator.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/PhaseNavigator/constants/phase-navigator.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/PhaseNavigator/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/QuestionCard/QuestionCard.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/QuestionCard/constants/question-card-display.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/QuestionCard/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/ReferenceText/ReferenceText.tsx` | pending | clean | eslint 2 |
| `src/domains/storyteller/ui/ReferenceText/constants/reference-text-display.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/ReferenceText/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/RichText/RichText.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/RichText/constants/rich-text.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/RichText/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/ScriptEditor/ScriptEditor.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/ScriptEditor/constants/script-editor.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/ScriptEditor/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/SeasonOverviewCard/SeasonOverviewCard.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/SeasonOverviewCard/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/StoryPlanBoard/StoryPlanBoard.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/StoryPlanBoard/constants/episode-premise-fields.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/StoryPlanBoard/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/StorytellerEmptyState/StorytellerEmptyState.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/StorytellerEmptyState/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/StorytellerImage/StorytellerImage.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/StorytellerImage/constants/storyteller-image.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/StorytellerImage/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/StorytellerLayout/StoryActionRenderer.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/StorytellerLayout/StorytellerLayout.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/StorytellerLayout/StorytellerWorkspace.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/StorytellerLayout/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/StorytellerLayout/panels/StorytellerCenterPanel.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/StorytellerLayout/panels/StorytellerLeftSidebar.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/StorytellerLayout/panels/StorytellerPageModals.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/StorytellerLayout/panels/StorytellerWritersRoom.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/StorytellerLayout/storyteller-dynamic-imports.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/StorytellerLayout/writers-room-chat.ts` | pending | clean | — |
| `src/domains/storyteller/ui/Timeline/Timeline.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/Timeline/constants/timeline.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/Timeline/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/WorldBible/BibleContext.tsx` | pending | clean | eslint 4 |
| `src/domains/storyteller/ui/WorldBible/BibleEvents.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/WorldBible/BibleFactions.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/WorldBible/BibleInspirations.tsx` | pending | clean | eslint 1 |
| `src/domains/storyteller/ui/WorldBible/BibleItems.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/WorldBible/BibleOverview.tsx` | pending | clean | eslint 1 |
| `src/domains/storyteller/ui/WorldBible/BibleRoadmap.tsx` | pending | clean | eslint 1 |
| `src/domains/storyteller/ui/WorldBible/BibleSoundtracks.tsx` | pending | clean | eslint 1 |
| `src/domains/storyteller/ui/WorldBible/BibleWorldLogic.tsx` | pending | clean | eslint 1 |
| `src/domains/storyteller/ui/WorldBible/SectionPendingOverlay.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/WorldBible/constants/bible-context.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/WorldBible/constants/bible-inspirations.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/WorldBible/constants/bible-overview.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/WorldBible/constants/bible-roadmap.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/WorldBiblePanel/WorldBiblePanel.tsx` | pending | clean | eslint 1 |
| `src/domains/storyteller/ui/WorldBiblePanel/constants/world-bible-panel.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/WorldBiblePanel/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/WorldRuleCard/WorldRuleCard.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/WorldRuleCard/constants/world-rule-display.ts` | exempt | exempt | wire/schema |
| `src/domains/storyteller/ui/WorldRuleCard/index.ts` | pending | clean | — |
| `src/domains/storyteller/ui/YouTubePlayer/YouTubePlayer.tsx` | pending | clean | — |
| `src/domains/storyteller/ui/YouTubePlayer/index.ts` | pending | clean | — |
| `src/domains/world-building-toolkit/constants/fidelity-service.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/constants/repaint-service.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/constants/select-mode-service.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/constants/settings-dialog.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/constants/tile-generation-service.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/constants/upscale-service.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/constants/world-query-params.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/core/constants/rle.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/core/rle.ts` | pending | clean | — |
| `src/domains/world-building-toolkit/core/upscale-provider-wire.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/core/world-types.ts` | pending | clean | — |
| `src/domains/world-building-toolkit/index.ts` | pending | clean | — |
| `src/domains/world-building-toolkit/core/io/constants/query-keys.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/core/io/world.api.ts` | pending | clean | — |
| `src/domains/world-building-toolkit/core/io/world.dto.ts` | pending | clean | eslint 3 |
| `src/domains/world-building-toolkit/core/io/world.keys.ts` | pending | clean | — |
| `src/domains/world-building-toolkit/services/WorldDataService.ts` | pending | clean | — |
| `src/domains/world-building-toolkit/state/client-services/FidelityService.ts` | pending | clean | — |
| `src/domains/world-building-toolkit/state/client-services/RepaintService.ts` | pending | clean | eslint 1 |
| `src/domains/world-building-toolkit/state/client-services/SelectModeService.ts` | pending | clean | eslint 2 |
| `src/domains/world-building-toolkit/state/client-services/TileGenerationService.ts` | pending | clean | eslint 2 |
| `src/domains/world-building-toolkit/state/client-services/UpscaleService.ts` | pending | clean | eslint 5 |
| `src/domains/world-building-toolkit/state/constants/world-data-store.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/state/constants/world-ui-store.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/state/queries/useWorldData.ts` | pending | clean | — |
| `src/domains/world-building-toolkit/state/useWorldStore.ts` | pending | clean | eslint 1 |
| `src/domains/world-building-toolkit/state/useWorldUiStore.ts` | pending | clean | eslint 14 |
| `src/domains/world-building-toolkit/tasks/enhance-fidelity.task.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/tasks/generate-tile.task.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/tasks/select-mj-variant.task.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/tasks/upscale-tile.task.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/ui/AssetsPanel.tsx` | pending | clean | eslint 2 |
| `src/domains/world-building-toolkit/ui/Canvas/RepaintCanvas.tsx` | pending | clean | — |
| `src/domains/world-building-toolkit/ui/Canvas/Tile.tsx` | pending | clean | eslint 1 |
| `src/domains/world-building-toolkit/ui/Canvas/WorldCanvas.tsx` | pending | clean | — |
| `src/domains/world-building-toolkit/ui/Canvas/constants/world-canvas.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/ui/MjVariantPicker.tsx` | pending | clean | eslint 1 |
| `src/domains/world-building-toolkit/ui/RepaintToolbar.tsx` | pending | clean | — |
| `src/domains/world-building-toolkit/ui/SelectModeToolbar.tsx` | pending | clean | — |
| `src/domains/world-building-toolkit/ui/SettingsDialog.tsx` | pending | clean | — |
| `src/domains/world-building-toolkit/ui/Sidebar/Sidebar.tsx` | pending | clean | eslint 2 |
| `src/domains/world-building-toolkit/ui/TileReviewDialog.tsx` | pending | clean | eslint 5 |
| `src/domains/world-building-toolkit/ui/WorldGenToolbar.tsx` | pending | clean | — |
| `src/domains/world-building-toolkit/ui/constants/assets-panel.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/ui/constants/mj-variant-picker.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/ui/constants/repaint-canvas.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/ui/constants/repaint-toolbar.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/ui/constants/select-mode-toolbar.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/ui/constants/sidebar.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/ui/constants/tile-review-dialog.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/ui/constants/tile-stage-labels.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/ui/constants/world-gen-page.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/ui/constants/world-gen-toolbar.ts` | exempt | exempt | wire/schema |
| `src/domains/world-building-toolkit/world-building-toolkit.config.ts` | pending | clean | — |
| `src/mastra/index.ts` | pending | clean | — |
| `src/mcp/agent.ts` | pending | clean | eslint 1 |
| `src/mcp/constants/agent.ts` | exempt | exempt | wire/schema |
| `src/mcp/constants/auth.ts` | exempt | exempt | wire/schema |
| `src/mcp/constants/env.ts` | exempt | exempt | wire/schema |
| `src/mcp/constants/request-context.ts` | exempt | exempt | wire/schema |
| `src/mcp/constants/resources.ts` | exempt | exempt | wire/schema |
| `src/mcp/constants/server.ts` | exempt | exempt | wire/schema |
| `src/mcp/constants/stdio.ts` | exempt | exempt | wire/schema |
| `src/mcp/core/auth.ts` | pending | clean | eslint 2 |
| `src/mcp/core/constants/request-context.ts` | exempt | exempt | wire/schema |
| `src/mcp/core/request-context.test.ts` | pending | clean | eslint 2 |
| `src/mcp/core/request-context.ts` | pending | clean | — |
| `src/mcp/core/types.ts` | pending | clean | eslint 1 |
| `src/mcp/domains/entities/tools.ts` | exempt | exempt | wire/schema |
| `src/mcp/domains/generation/tools.ts` | exempt | exempt | wire/schema |
| `src/mcp/domains/storyteller/tools.ts` | exempt | exempt | wire/schema |
| `src/mcp/domains/trigger/tools.ts` | exempt | exempt | wire/schema |
| `src/mcp/env.ts` | pending | clean | — |
| `src/mcp/resources/index.ts` | pending | clean | — |
| `src/mcp/server.ts` | pending | clean | — |
| `src/mcp/stdio.ts` | pending | clean | — |
| `src/shared/agent-kernel/MastraInstance.ts` | pending | clean | — |
| `src/shared/agent-kernel/action-wire.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/agents/agent-response.ts` | pending | clean | — |
| `src/shared/agent-kernel/constants/agent-memory.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/constants/cross-domain-context.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/constants/cursor-runner.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/constants/executive-agent.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/constants/mastra-bootstrap.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/constants/mastra-instance.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/constants/plan-schemas.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/constants/planner-tool.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/constants/runtime-registry.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/constants/skill-loader.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/context/cross-domain-context.ts` | pending | clean | eslint 1 |
| `src/shared/agent-kernel/cursor-runner.ts` | pending | clean | — |
| `src/shared/agent-kernel/executive.ts` | pending | clean | eslint 4 |
| `src/shared/agent-kernel/index.ts` | pending | clean | eslint 2 |
| `src/shared/agent-kernel/mastra/agents/constants/registry.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/mastra/create-mastra.ts` | pending | clean | — |
| `src/shared/agent-kernel/mastra/index.ts` | pending | clean | — |
| `src/shared/agent-kernel/mastra/mcp/constants/studio-servers.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/mastra/mcp/studio-servers.ts` | pending | clean | — |
| `src/shared/agent-kernel/mastra/runtime-registry.ts` | pending | clean | — |
| `src/shared/agent-kernel/mastra/tools/bundles.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/memory/agent-memory.ts` | pending | clean | — |
| `src/shared/agent-kernel/models.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/persistence/memory-store.ts` | pending | clean | — |
| `src/shared/agent-kernel/planner.ts` | pending | clean | — |
| `src/shared/agent-kernel/prompts/registry.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/prompts/repository.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/prompts/types.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/schemas.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/scorers/__tests__/scorers.test.ts` | pending | clean | — |
| `src/shared/agent-kernel/scorers/consistency-scorer.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/scorers/constants/shared.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/scorers/hallucination-scorer.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/scorers/index.ts` | pending | clean | — |
| `src/shared/agent-kernel/scorers/magic-scorer.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/scorers/persona-fidelity-scorer.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/scorers/prose-craft-scorer.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/scorers/shared.ts` | pending | clean | — |
| `src/shared/agent-kernel/scorers/stakes-cost-scorer.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/scorers/story-motion-scorer.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/search/hybrid-search.ts` | pending | clean | eslint 3 |
| `src/shared/agent-kernel/search/index.ts` | pending | clean | — |
| `src/shared/agent-kernel/skills/eval-schema.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/skills/index.ts` | pending | clean | — |
| `src/shared/agent-kernel/skills/skill-loader.ts` | pending | clean | — |
| `src/shared/agent-kernel/workflows/constants/human-loop-workflow.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/workflows/human-loop-workflow.ts` | pending | clean | eslint 1 |
| `src/shared/agent-kernel/workflows/schema.ts` | pending | clean | — |
| `src/shared/agent-kernel/workspace/constants/storyteller-workspace.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/workspace/index.ts` | pending | clean | — |
| `src/shared/agent-kernel/workspace/script-artifact-wire.ts` | exempt | exempt | wire/schema |
| `src/shared/agent-kernel/workspace/storyteller-workspace.ts` | pending | clean | — |
| `src/shared/ai/ai-provider-config.ts` | pending | clean | — |
| `src/shared/ai/constants/ai-provider-config.ts` | exempt | exempt | wire/schema |
| `src/shared/ai/constants/fal.ts` | exempt | exempt | wire/schema |
| `src/shared/ai/constants/gateway.ts` | exempt | exempt | wire/schema |
| `src/shared/ai/constants/hybrid-search.ts` | exempt | exempt | wire/schema |
| `src/shared/ai/constants/legnext.ts` | exempt | exempt | wire/schema |
| `src/shared/ai/constants/meshy.ts` | exempt | exempt | wire/schema |
| `src/shared/ai/constants/replicate-client.ts` | exempt | exempt | wire/schema |
| `src/shared/ai/constants/replicate-output.ts` | exempt | exempt | wire/schema |
| `src/shared/ai/constants/reranker.ts` | exempt | exempt | wire/schema |
| `src/shared/ai/constants/voyage-embeddings.ts` | exempt | exempt | wire/schema |
| `src/shared/ai/contextAssembler.ts` | exempt | exempt | wire/schema |
| `src/shared/ai/contextAssemblerWorker.ts` | exempt | exempt | wire/schema |
| `src/shared/ai/embeddings/voyage-embeddings.ts` | pending | clean | — |
| `src/shared/ai/fal.ts` | pending | clean | eslint 1 |
| `src/shared/ai/gateway/gateway.ts` | pending | clean | eslint 1 |
| `src/shared/ai/gateway/types.ts` | pending | clean | — |
| `src/shared/ai/index.ts` | pending | clean | — |
| `src/shared/ai/legnext.ts` | pending | clean | eslint 1 |
| `src/shared/ai/meshy.ts` | pending | clean | — |
| `src/shared/ai/rag/hybrid-search.ts` | exempt | exempt | wire/schema; eslint 1 |
| `src/shared/ai/rag/query-expander.ts` | exempt | exempt | wire/schema |
| `src/shared/ai/rag/reranker.ts` | exempt | exempt | wire/schema |
| `src/shared/ai/rag/semantic-chunker.ts` | exempt | exempt | wire/schema |
| `src/shared/ai/replicate-output.ts` | pending | clean | — |
| `src/shared/ai/replicate.ts` | pending | clean | eslint 2 |
| `src/shared/ai/types.ts` | pending | clean | eslint 1 |
| `src/shared/auth/admin-users.tsx` | pending | clean | — |
| `src/shared/auth/auth.ts` | pending | clean | — |
| `src/shared/auth/bible-permissions.ts` | pending | clean | — |
| `src/shared/auth/constants/admin-users.ts` | exempt | exempt | wire/schema |
| `src/shared/auth/constants/auth-messages.ts` | exempt | exempt | wire/schema |
| `src/shared/auth/constants/auth-validation-messages.ts` | exempt | exempt | wire/schema |
| `src/shared/auth/constants/bible-permissions.ts` | exempt | exempt | wire/schema |
| `src/shared/auth/constants/e2e-auth.ts` | exempt | exempt | wire/schema |
| `src/shared/auth/constants/security.ts` | exempt | exempt | wire/schema |
| `src/shared/auth/constants/supabase-admin.ts` | exempt | exempt | wire/schema |
| `src/shared/auth/index.ts` | pending | clean | — |
| `src/shared/auth/security.ts` | pending | clean | eslint 7 |
| `src/shared/auth/supabase-admin.ts` | pending | clean | — |
| `src/shared/auth/supabase-route-client.ts` | pending | clean | — |
| `src/shared/auth/useAuthStore.ts` | pending | clean | — |
| `src/shared/auth/validation.ts` | pending | clean | — |
| `src/shared/chat/core/constants/chat-messages.ts` | exempt | exempt | wire/schema |
| `src/shared/chat/core/constants/chat-stream.ts` | exempt | exempt | wire/schema |
| `src/shared/chat/core/constants/game-entity-mentions.ts` | exempt | exempt | wire/schema |
| `src/shared/chat/core/constants/mention-context-xml.ts` | exempt | exempt | wire/schema |
| `src/shared/chat/core/constants/mention-types.ts` | exempt | exempt | wire/schema |
| `src/shared/chat/core/constants/thinking-messages.ts` | exempt | exempt | wire/schema |
| `src/shared/chat/core/mentions/context-builder.ts` | pending | clean | — |
| `src/shared/chat/core/mentions/game-entity-provider.ts` | pending | clean | — |
| `src/shared/chat/core/mentions/types.ts` | pending | clean | — |
| `src/shared/chat/core/protocol.ts` | pending | clean | — |
| `src/shared/chat/core/renderers.tsx` | pending | clean | — |
| `src/shared/chat/core/types.ts` | pending | clean | eslint 7 |
| `src/shared/chat/index.ts` | pending | clean | — |
| `src/shared/chat/state/constants/use-chat-stream-log.ts` | exempt | exempt | wire/schema |
| `src/shared/chat/state/useChatStream.test.ts` | pending | clean | eslint 17 |
| `src/shared/chat/state/useChatStream.ts` | pending | clean | eslint 5 |
| `src/shared/chat/ui/AgentLog.tsx` | pending | clean | eslint 3 |
| `src/shared/chat/ui/ChatInput.tsx` | pending | clean | — |
| `src/shared/chat/ui/ChatInterface.tsx` | pending | clean | eslint 2 |
| `src/shared/chat/ui/CitationDisplay.tsx` | pending | clean | — |
| `src/shared/chat/ui/MentionChip.tsx` | pending | clean | — |
| `src/shared/chat/ui/ModelSelector.tsx` | pending | clean | — |
| `src/shared/chat/ui/QuickActions.tsx` | pending | clean | — |
| `src/shared/chat/ui/SectionProgress.tsx` | pending | clean | eslint 2 |
| `src/shared/chat/ui/StreamingSectionsInline.tsx` | pending | clean | — |
| `src/shared/chat/ui/StreamingTerminal.tsx` | pending | clean | — |
| `src/shared/chat/ui/constants/agent-log.ts` | exempt | exempt | wire/schema |
| `src/shared/chat/ui/constants/agent-status.ts` | exempt | exempt | wire/schema |
| `src/shared/chat/ui/constants/chat-input.ts` | exempt | exempt | wire/schema |
| `src/shared/chat/ui/constants/chat-interface.ts` | exempt | exempt | wire/schema |
| `src/shared/chat/ui/constants/citation-display.ts` | exempt | exempt | wire/schema |
| `src/shared/chat/ui/constants/mention-chip.ts` | exempt | exempt | wire/schema |
| `src/shared/chat/ui/constants/quick-actions.ts` | exempt | exempt | wire/schema |
| `src/shared/chat/ui/constants/section-progress.ts` | exempt | exempt | wire/schema |
| `src/shared/chat/ui/constants/streaming-terminal.ts` | exempt | exempt | wire/schema |
| `src/shared/chat/ui/index.ts` | pending | clean | — |
| `src/shared/data/EntitiesService.ts` | pending | clean | — |
| `src/shared/data/api-utils.ts` | pending | clean | — |
| `src/shared/data/chat-persistence.ts` | pending | clean | — |
| `src/shared/data/constants/api-errors.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/chat-persistence.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/db-tables.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/deep-merge.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/entities-service.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/game-entities-wire.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/index.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/json-guards.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/llm-providers.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/localStorage.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/polling.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/project-loader.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/protocol.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/repaint-gemini.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/root-layout-fonts.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/root-layout.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/route-metadata.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/style-presets.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/trigger-tile-route.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/url.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/visuals.ts` | exempt | exempt | wire/schema |
| `src/shared/data/constants/worldPromptIdeas.ts` | exempt | exempt | wire/schema |
| `src/shared/data/count-occurrences.ts` | pending | clean | — |
| `src/shared/data/deep-merge.ts` | pending | clean | — |
| `src/shared/data/fetch-cache.ts` | pending | clean | — |
| `src/shared/data/form-data-guards.ts` | pending | clean | — |
| `src/shared/data/generation/TilesService.ts` | pending | clean | eslint 2 |
| `src/shared/data/generation/constants/tiles-service.ts` | exempt | exempt | wire/schema |
| `src/shared/data/index.ts` | pending | clean | — |
| `src/shared/data/json-guards.ts` | pending | clean | — |
| `src/shared/data/queries/useGameEntities.ts` | pending | clean | — |
| `src/shared/data/react-query.tsx` | pending | clean | — |
| `src/shared/data/seedFromString.ts` | pending | clean | — |
| `src/shared/data/server-guard.ts` | pending | clean | — |
| `src/shared/data/server/constants/generation-prompts.ts` | exempt | exempt | wire/schema |
| `src/shared/data/server/constants/image-service.ts` | exempt | exempt | wire/schema |
| `src/shared/data/server/image-service.ts` | pending | clean | — |
| `src/shared/data/server/prompts.ts` | pending | clean | — |
| `src/shared/data/storage/StorageService.ts` | pending | clean | — |
| `src/shared/data/storage/constants/storage-service.ts` | exempt | exempt | wire/schema |
| `src/shared/data/storage/database.types.ts` | pending | clean | — |
| `src/shared/data/storage/index.ts` | pending | clean | — |
| `src/shared/data/storage/supabase.ts` | pending | clean | — |
| `src/shared/data/storage/supabaseClient.ts` | pending | clean | — |
| `src/shared/data/trace-session.ts` | pending | clean | — |
| `src/shared/data/url.ts` | pending | clean | — |
| `src/shared/data/useProjectFromUrl.ts` | pending | clean | eslint 1 |
| `src/shared/data/utils.ts` | pending | clean | — |
| `src/shared/errors/constants/error-utils.ts` | exempt | exempt | wire/schema |
| `src/shared/errors/error-utils.ts` | pending | clean | — |
| `src/shared/errors/index.ts` | pending | clean | — |
| `src/shared/errors/useErrorStore.ts` | pending | clean | — |
| `src/shared/jobs/constants/async-operation-status.ts` | exempt | exempt | wire/schema |
| `src/shared/jobs/constants/global-status-store.ts` | exempt | exempt | wire/schema |
| `src/shared/jobs/constants/operation-type-id.ts` | exempt | exempt | wire/schema |
| `src/shared/jobs/constants/trigger-active-status.ts` | exempt | exempt | wire/schema |
| `src/shared/jobs/index.ts` | pending | clean | — |
| `src/shared/jobs/useGlobalStatusStore.ts` | pending | clean | — |
| `src/shared/observability/constants/instrumentation.ts` | exempt | exempt | wire/schema |
| `src/shared/observability/constants/trace-sanitize.ts` | exempt | exempt | wire/schema |
| `src/shared/observability/index.ts` | pending | clean | — |
| `src/shared/observability/observability.ts` | pending | clean | — |
| `src/shared/tours/asset-exporter-tour.tsx` | pending | clean | — |
| `src/shared/tours/constants/tour-positions.ts` | exempt | exempt | wire/schema |
| `src/shared/tours/constants/tour-step-ids.ts` | exempt | exempt | wire/schema |
| `src/shared/tours/constants/tour-ui.ts` | exempt | exempt | wire/schema |
| `src/shared/tours/index.ts` | pending | clean | — |
| `src/shared/tours/interior-designer-tour.tsx` | pending | clean | — |
| `src/shared/tours/loop-creator-tour.tsx` | pending | clean | — |
| `src/shared/tours/module-tours.ts` | pending | clean | — |
| `src/shared/tours/storyteller-tour.tsx` | pending | clean | — |
| `src/shared/tours/tour-constants.ts` | pending | clean | — |
| `src/shared/tours/tour-types.ts` | pending | clean | — |
| `src/shared/tours/world-gen-tour.tsx` | pending | clean | — |
| `src/shared/types/constants/onboarding.ts` | exempt | exempt | wire/schema |
| `src/shared/types/enums.ts` | exempt | exempt | wire/schema |
| `src/shared/types/index.ts` | pending | clean | — |
| `src/shared/types/onboarding.ts` | pending | clean | — |
| `src/shared/types/three-jsx.d.ts` | exempt | exempt | wire/schema |
| `src/trigger/constants/cursor-execute.ts` | exempt | exempt | wire/schema |
| `src/trigger/constants/legnext-upload-paint.ts` | exempt | exempt | wire/schema |
| `src/trigger/constants/llm-logger.ts` | exempt | exempt | wire/schema |
| `src/trigger/cursor-execute.task.ts` | pending | clean | — |
| `src/trigger/index.ts` | pending | clean | — |
| `src/trigger/providers/follow-up-provider.ts` | pending | clean | — |
| `src/trigger/providers/legnext-upload-paint.ts` | pending | clean | — |
| `src/trigger/utils/llm-logger.ts` | pending | clean | eslint 13 |
