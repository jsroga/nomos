# World Building Toolkit Module Documentation

## Overview

The World Building Toolkit is a suite of AI-driven tools dedicated to procedural environment generation and high-fidelity asset refinement. While the Storyteller focuses on narrative, the Toolkit focuses on the "physical" tiles and textures that make up the game world.

## Core Services

### 1. Tile Generation (`TileGenerationService`)

The heart of the toolkit. It handles the procedural creation of world tiles (top-down or isometric).

- **Style Consistency**: Uses reference images and predefined prompt templates to ensure the AI generates tiles that fit the project's art direction.
- **Tiling Logic**: Algorithms to ensure that generated edges align with adjacent tiles for a seamless world map.

### 2. Upscale & Refinement (`UpscaleService`)

Takes low-resolution AI outputs and transforms them into production-ready assets.

- **MJ Integration**: Leverages Midjourney (or similar high-end models) for detailed upscaling.
- **Review Workflow**: Includes `UpscaleReviewDialog` for designers to pick the best variant before committing to the tile library.

### 3. Repaint & Modification (`RepaintService`)

Allows for localized edits to existing tiles.

- **Inpainting**: Designers can mask areas of a tile and prompt the AI to change specific features (e.g., adding a door to a wall tile).
- **`RepaintToolbar`**: Provides a specialized UI for real-time masking and sub-prompts.

## Components

### `WorldGenToolbar`

The primary interface for triggering generation jobs and monitoring progress.

### `MjVariantPicker`

A specialized UI component for selecting between multiple AI-generated iterations (variations) of a single tile or asset.

### `SettingsDialog`

A complex configuration interface where users define the "art direction" parameters: color palettes, architectural styles, and atmospheric lighting.

## Data Persistence

Generated tiles and their metadata are stored and managed via a dedicated Supabase schema, allowing for global retrieval across different project phases.

## Workflow

1. **Configure**: Set the art direction in `SettingsDialog`.
2. **Generate**: Use `WorldGenToolbar` to create base tiles.
3. **Refine**: Upscale high-potential tiles using the `UpscaleService`.
4. **Modify**: Fine-tune specific details with the `RepaintService`.
