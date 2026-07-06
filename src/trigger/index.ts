/**
 * Trigger.dev task registry.
 *
 * Re-exports all module-owned tasks for build discovery via trigger.config.ts.
 */

// World Building Toolkit
export * from '@/domains/world-building-toolkit/tasks/generate-tile.task'
export * from '@/domains/world-building-toolkit/tasks/upscale-tile.task'
export * from '@/domains/world-building-toolkit/tasks/enhance-fidelity.task'
export * from '@/domains/world-building-toolkit/tasks/select-mj-variant.task'

// 3D Asset Exporter
export * from '@/domains/3d-asset-exporter/tasks/generate-3d-model.task'
export * from '@/domains/3d-asset-exporter/tasks/text-to-3d.task'
export * from '@/domains/3d-asset-exporter/tasks/remesh-3d-model.task'
export * from '@/domains/3d-asset-exporter/tasks/retexture-model.task'
export * from '@/domains/3d-asset-exporter/tasks/surface-material.task'

// Storyteller
export * from '@/domains/storyteller/tasks/generate-episode-poster.task'
export * from '@/domains/storyteller/tasks/generate-storyboard.task'
export * from '@/domains/storyteller/tasks/generate-combined-storyboard.task'
export * from '@/domains/storyteller/tasks/generate-poster.task'
export * from '@/domains/storyteller/tasks/generate-portrait.task'
export * from '@/domains/storyteller/tasks/generate-moodboard.task'
export * from '@/domains/storyteller/tasks/select-portrait-variant.task'
export * from '@/domains/storyteller/tasks/upload-asset.task'

// Dark factory — Cursor SDK execute loop (cross-cutting, not domain-owned)
export * from '@/trigger/cursor-execute.task'
