# Interior Designer Module Documentation

## Overview

The Interior Designer module is a powerful 3D world-building tool that allows users to sculpt terrain, paint materials, and place architectural elements (walls, floors) and 3D objects in a real-time environment built with React Three Fiber (R3F).

## State Management

The module uses a dual-store architecture for performance:

- **`useInteriorStore`**: Manages scene objects (walls, floors, props), selection state, undo/redo history (via Zundo), and interaction modes.
- **`useTerrainStore`**: Dedicated to high-frequency terrain data. It holds the `heightmap` (Float32Array) and `materialMap` (Uint8Array), ensuring that terrain sculpting updates do not trigger heavy re-renders in the main scene graph.

## Core Systems

### 1. Surface Manager & Sculpting
The `SurfaceManager` (`src/domains/interior-designer/components/SurfaceManager.tsx`) handles the rendering and interaction of different surface types.

**Surface Configuration:**
Each surface type (Grass, Water, Dirt, Road, Pavement, Mars, Rock) has specific rendering properties:
*   `depth`: Extrusion height.
*   `verticalOffset`: To prevent Z-fighting between layered surfaces.
*   `roughness/metalness`: PBR material properties.

**SculptableSurface:**
Ground surfaces (like Grass, Dirt, Mars) are rendered as `SculptableSurface`.
-   **Vertex Manipulation**: Uses a dynamic heightmap to displace vertices of the plane geometry.
-   **Brushes**: Supports Raise, Lower, Flatten, and Smooth operations.
-   **Performance**: Updates are optimized using in-place heightmap mutation and version flags.

### 2. Voxel System
A secondary terrain system for block-based construction, suitable for mechanical or structured environments.

### 3. Material Painting
Materials are painted onto the terrain using a splat-mapping approach via `TerrainShaderMaterial`.

## Shaders: `TerrainShaderMaterial`
A custom GLSL material that handles:
-   **Splat Mapping**: Blending textures based on `materialMap`.
-   **Dynamic Lighting**: Shadows and sun angle calculations.
-   **Normal Calculation**: Real-time normal generation from the heightmap.

## Architecture & Managers

The scene is orchestrated by several managers within the `InteriorCanvas`:
-   **`ObjectManager`**: Renders 3D GLTF/OBJ assets.
-   **`WallManager` / `FloorManager`**: Generates procedural geometry.
-   **`TransformManager`**: Gizmos for moving/rotating/scaling.
-   **`DesignManager`**: Persistence (Save/Load).

## Exporters
-   **`Exporter.tsx`**: Standard scene export.
-   **`RetextureExporter.tsx`**: Export with custom materials.
