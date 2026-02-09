# 3D Asset Exporter Module Documentation

## Overview

The 3D Asset Exporter module provides a dedicated workspace for ingesting, editing, and preparing 3D assets for use across the application's world-building tools. It acts as a bridge between raw 3D files (GLB/GLTF) and the optimized scene objects used by the Interior Designer and Storyteller modules.

## Key Components

### `ThreeDPanel`

The main visual workspace for the exporter. It features a high-fidelity 3D viewer (built with R3F) that allows for inspecting assets in a controlled environment with dedicated lighting and stage setups.

### `AssetEditor`

The central logic component for modifying asset properties. Features include:

- **Transform Adjustments**: Fine-tuning the default scale, rotation, and offset of assets to ensure consistent sizing in the world.
- **Material Overrides**: Applying custom textures or shader parameters to existing mesh materials.
- **Metadata Management**: Assigning object types and tags for categorization in the asset library.

### `AssetUploadZone`

Handles the ingestion of raw 3D files. It includes validation logic to ensure models meet the minimum requirements for real-time rendering (e.g., polygon count warnings, missing texture detection).

## Services

### `ThreeDService`

A utility service that provides core 3D operations, such as:

- **Geometry Processing**: Centering geometries and calculating bounding boxes for automatic scaling.
- **Texture Compression**: Tools for optimizing textures for web-based delivery.
- **Serialization**: Converting modified assets into a standardized JSON format that includes both the model reference and its prep-workspace overrides.

## Integration Workflow

1. **Upload**: User provides a GLB/GLTF file through the `AssetUploadZone`.
2. **Review**: The asset is rendered in the `ThreeDPanel` for visual inspection.
3. **Configure**: Using the `AssetEditor`, the user calibrates the asset (fixing orientation, scaling, or material issues).
4. **Publish**: The finalized configuration is saved and becomes available in the global object library used by other modules.
