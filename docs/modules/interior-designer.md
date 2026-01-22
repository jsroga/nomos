# Interior Designer Module Documentation

## Overview

The Interior Designer module is a powerful 3D world-building tool that allows users to sculpt terrain, paint materials, and place architectural elements (walls, floors) and 3D objects in a real-time environment built with React Three Fiber (R3F).

## State Management

The module uses a dual-store architecture for performance:

- **`useInteriorStore`**: Manages scene objects (walls, floors, props), selection state, undo/redo history (via Zundo), and interaction modes.
- **`useTerrainStore`**: Dedicated to high-frequency terrain data. It holds the `heightmap` (Float32Array) and `materialMap` (Uint8Array), ensuring that terrain sculpting updates do not trigger heavy re-renders in the main scene graph.

## Core Systems

### Vertex-Based Sculpting (`SculptableSurface`)

The primary natural terrain system. It uses a dynamic heightmap to displace vertices of a plane geometry.

- **Brushes**: Supports raising, lowering, flattening, and smoothing.
- **Performance**: Uses in-place mutation of the heightmap and a version flag (`heightmapVersion`) to efficiently signal geometry updates to the GPU.

### Voxel System (`VoxelTerrainMesh`)

A secondary terrain system for block-based construction, suitable for mechanical or structured environments. It uses a 3D grid of voxel data to generate meshes.

### Material Painting

Materials (grass, dirt, rock, etc.) are painted onto the terrain using a `materialMap`. This map is processed in the custom `TerrainShaderMaterial`.

## Shaders

### `TerrainShaderMaterial`

A custom GLSL material that handles:

- **Splat Mapping**: Blending multiple textures based on the `materialMap`.
- **Dynamic Lighting**: Calculations for sun angle and shadows on the displaced terrain geometry.
- **Normal Calculation**: Real-time generation of normals based on the heightmap for correct lighting.

## Architecture & Managers

The scene is orchestrated by several managers within the `InteriorCanvas`:

- **`ObjectManager`**: Renders and manages the lifecycle of 3D GLTF/OBJ assets.
- **`WallManager` / `FloorManager`**: Generates procedural architectural geometry based on user-defined points.
- **`TransformManager`**: Provides gizmos for moving, rotating, and scaling objects.
- **`DesignManager`**: Handles persistence, allowing users to save and load complex designs from the database.

## Exporters

- **`Exporter.tsx`**: Specialized tool for exporting the generated 3D scene.
- **`RetextureExporter.tsx`**: Handles exporting modified assets with custom material/texture assignments.
